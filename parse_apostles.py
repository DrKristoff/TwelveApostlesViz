import re
import json
import datetime

def parse_date(date_str):
    if not date_str:
        return None
    match_iso = re.search(r'\((\d{4}-\d{2}-\d{2})\)', date_str)
    if match_iso:
        return match_iso.group(1)

    match_iso_long = re.search(r'\((\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\)', date_str)
    if match_iso_long:
        return match_iso_long.group(1).split('T')[0]

    clean_str = re.sub(r'\s*\(.*?\)', '', date_str).strip()

    try:
        dt = datetime.datetime.strptime(clean_str, "%B %d, %Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        pass

    try:
        dt = datetime.datetime.strptime(clean_str, "%d %B %Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        pass

    match_year = re.search(r'\d{4}', date_str)
    if match_year:
        return f"{match_year.group(0)}-01-01"

    return None

def parse_single_entry(line, roles):
    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    # Filter future hallucinations
    if "2025" in line:
        return

    start_date = None
    end_date = None
    role_desc = None

    if " – " in line or " - " in line:
        parts = re.split(r' – | - ', line)
        if len(parts) >= 2:
            end_part = parts[-1].strip()
            # The start part is everything before the delimiter.
            # Since re.split returns all parts, we need to be careful if there are multiple delimiters.
            # Usually the date range is at the end.
            # "Role Desc ... Date - Date"
            # So start_part_candidate should be parts[-2].

            start_part_candidate = parts[-2].strip()

            if "present" in end_part.lower():
                end_date = None
            else:
                end_date = parse_date(end_part)

            # Find start date in start_part_candidate
            last_month_idx = -1
            for m in months:
                idx = start_part_candidate.rfind(m)
                if idx > last_month_idx:
                    last_month_idx = idx

            if last_month_idx != -1:
                date_str = start_part_candidate[last_month_idx:]
                start_date = parse_date(date_str)

                # Reconstruct prefix from all previous parts if any
                # Actually, if we split by dash, the role description might be in parts[0]...parts[-3] + start of parts[-2]
                # But typically the dash separates dates.
                # "Role - something" -> "Role", "something"
                # If the line is "Positions: Role Name, Date - Date"
                # split gives ["Positions: Role Name, Date ", " Date"]

                # Let's look at the logic again.
                # If we have "Role - subrole, Date - Date"
                # The last dash separates the dates.

                # Let's rely on finding the Date in the line, rather than splitting by dash first?
                # But splitting by dash helps isolate the End Date.
                pass

                # Calculate prefix
                # The part before the date in start_part_candidate
                prefix_in_segment = start_part_candidate[:last_month_idx].strip()

                # Join previous parts
                prefix_start = " - ".join(parts[:-2])
                if prefix_start:
                    prefix = prefix_start + " - " + prefix_in_segment
                else:
                    prefix = prefix_in_segment

                if prefix.endswith(','): prefix = prefix[:-1]
                role_desc = prefix.strip()

    if not start_date:
        # Fallback to single date at end
        last_month_idx = -1
        for m in months:
            idx = line.rfind(m)
            if idx > last_month_idx:
                last_month_idx = idx

        if last_month_idx != -1:
            date_str = line[last_month_idx:]
            start_date = parse_date(date_str)
            if start_date:
                prefix = line[:last_month_idx].strip()
                if prefix.endswith(','): prefix = prefix[:-1]
                role_desc = prefix
                end_date = None

    if start_date:
        role_type = "Apostle" # Default
        normalized_role = "Apostle"

        if role_desc:
            if "President of the Church" in role_desc:
                normalized_role = "President"
            elif "First Counselor" in role_desc:
                normalized_role = "First Counselor"
            elif "Second Counselor" in role_desc:
                normalized_role = "Second Counselor"
            elif "Counselor" in role_desc:
                normalized_role = "Counselor"

        roles.append({
            "type": normalized_role,
            "raw_role": role_desc,
            "startDate": start_date,
            "endDate": end_date
        })


def parse_positions(lines):
    roles = []
    buffer = ""

    for line in lines:
        line = line.strip()
        if not line: continue
        if line.startswith("Positions:"):
            line = line.replace("Positions:", "").strip()

        # Check if line has a date pattern (YYYY-MM-DD) which indicates end of entry in this dataset
        if re.search(r'\(\d{4}-\d{2}-\d{2}\)', line):
            full_entry = (buffer + " " + line).strip()
            parse_single_entry(full_entry, roles)
            buffer = ""
        else:
            buffer += " " + line

    return roles

def parse_links(content):
    link_map = {}
    lines = content.split('\n')
    for line in lines:
        match = re.match(r'^\s*(\d+)\.\s+(https?://.*)', line)
        if match:
            link_map[match.group(1)] = match.group(2)
    return link_map

def main():
    try:
        with open('raw_data.txt', 'r') as f:
            content = f.read()
    except FileNotFoundError:
        print("[]")
        return

    # Split links section
    parts = re.split(r'\n\s*Name: Links', content)
    main_content = parts[0]
    links_content = parts[1] if len(parts) > 1 else ""

    link_map = parse_links(links_content)

    entries = re.split(r'\n\s*Name: ', main_content)

    people = []

    for entry in entries:
        if not entry.strip(): continue

        lines = entry.split('\n')
        name = lines[0].strip()

        birth_date = None
        death_date = None
        image_ref = None
        positions_lines = []

        for line in lines[1:]:
            line = line.strip()
            if line.startswith("Born:"):
                birth_date = parse_date(line.replace("Born:", "").strip())
            elif line.startswith("Died:"):
                death_date = parse_date(line.replace("Died:", "").strip())
            elif line.startswith("Image:"):
                match_img = re.search(r'\[(\d+)\]', line)
                if match_img:
                    image_ref = match_img.group(1)
            else:
                positions_lines.append(line)

        roles = parse_positions(positions_lines)

        ordination_date = None
        dates = []
        for r in roles:
            if r['startDate']:
                dates.append(r['startDate'])

        if dates:
            dates.sort()
            ordination_date = dates[0]

        slug = name.lower().replace('.', '').replace(' ', '-')

        image_url = link_map.get(image_ref) if image_ref else None

        # Filter out hallucinated future people entirely if they have no valid past roles
        has_valid_past_role = False
        for r in roles:
            if r['startDate'] and r['startDate'] < "2025-01-01":
                has_valid_past_role = True

        # If ordination date is future (2025+) and no past roles, skip
        if not has_valid_past_role and ordination_date and ordination_date >= "2025-01-01":
             continue

        # Also skip if no roles at all (and no ordination date?)
        if not roles and not ordination_date:
            continue

        people.append({
            "id": slug,
            "name": name,
            "birthDate": birth_date,
            "deathDate": death_date,
            "ordinationDate": ordination_date,
            "imageUrl": image_url,
            "roles": roles
        })

    print(json.dumps(people, indent=2))

if __name__ == "__main__":
    main()

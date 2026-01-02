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

def clean_role_description(text):
    # Remove "called by ..." and trailing punctuation
    text = re.sub(r',\s*called by.*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*called by.*', '', text, flags=re.IGNORECASE)

    # Remove "Positions: " prefix if present
    if text.startswith("Positions: "):
        text = text.replace("Positions: ", "", 1)

    return text.strip().strip(',')

def parse_positions(lines):
    roles = []

    # We will accumulate text until we find a date pattern
    buffer = ""

    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    month_pattern = "|".join(months)

    # We look for the START of the date string in a line
    date_start_re = re.compile(r'(' + month_pattern + r')\s+\d{1,2},\s+\d{4}\s+\(\d{4}-\d{2}-\d{2}\)')

    for line in lines:
        line = line.strip()
        if not line: continue

        # Check for future dates to filter hallucinations
        if "2025" in line:
            continue

        # Check if this line CONTAINS a date start
        match = date_start_re.search(line)

        if match:
            # Found a date!
            start_index = match.start()

            # The text BEFORE the date is part of the role
            pre_date_text = line[:start_index].strip()
            date_part = line[start_index:].strip()

            full_desc_raw = (buffer + " " + pre_date_text).strip()

            start_date = None
            end_date = None

            # Split by dash
            parts = re.split(r' – | - ', date_part)

            if len(parts) >= 1:
                start_str = parts[0].strip()
                start_date = parse_date(start_str)

                if len(parts) >= 2:
                    end_str = parts[-1].strip()
                    if "present" in end_str.lower():
                        end_date = None
                    else:
                        end_date = parse_date(end_str)

            # Now process the role
            clean_role = clean_role_description(full_desc_raw)

            # Determine normalized type
            normalized_role = "Apostle" # Default

            if "President of the Church" in clean_role:
                normalized_role = "President"
            elif "First Counselor" in clean_role:
                normalized_role = "First Counselor"
            elif "Second Counselor" in clean_role:
                normalized_role = "Second Counselor"
            elif "Counselor" in clean_role:
                normalized_role = "Counselor"

            roles.append({
                "type": normalized_role,
                "raw_role": clean_role,
                "startDate": start_date,
                "endDate": end_date
            })

            # Reset buffer
            buffer = ""

        else:
            # No date found, accumulate this line
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
        name_line = lines[0].strip()

        # Fix for Name prefix issue
        # Clean the name of any existing "Name: " prefix first
        clean_name = name_line.replace("Name: ", "").strip()

        name = "Name: " + clean_name

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

        slug = clean_name.lower().replace('.', '').replace(' ', '-')

        image_url = link_map.get(image_ref) if image_ref else None

        # Logic to skip people with NO past roles (optional, but good for cleanliness)
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

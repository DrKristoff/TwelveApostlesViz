# LDS Church Leadership Timeline Visualization

A React web application that visualizes the historical timeline of the Presidents and Apostles of The Church of Jesus Christ of Latter-day Saints from 1830 to the present.

![Timeline Screenshot](verification/full_quorum_check.png)

## Features

*   **Circular "Donut" Visualization**: Displays the Quorum of the Twelve Apostles in a ring, arranged by seniority (clockwise from 12 o'clock).
*   **Center First Presidency**: Displays the President and Counselors in the center of the visualization.
*   **Dynamic Timeline**: Navigate through history event-by-event (ordinations, deaths, releases) using the arrow keys or on-screen buttons.
*   **Custom Date Selection**: Jump to any specific date to see the leadership organization at that moment in history.
*   **Historical Accuracy**: Correctly handles periods of "Interregnum" (vacancies in the First Presidency) by dissolving the presidency and returning counselors to their seniority positions in the Quorum.
*   **Animated Transitions**: Smooth animations as leaders move between the Quorum and First Presidency or are called/released.

## Tech Stack

*   **React** (Vite)
*   **Material UI (MUI)** for components and styling.
*   **Framer Motion** for animations.
*   **date-fns** for date manipulation.

## Setup & Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## Data Source

The data is sourced from Wikipedia and compiled into `src/data/apostles.json`.
A python script `parse_apostles.py` was used to parse raw text data and generate the JSON dataset, including image URLs.

## Usage

*   **Arrow Buttons**: Click the Left/Right arrows at the bottom to jump to the previous or next "Event" (ordination, death, etc).
*   **Date Picker**: Click the date at the bottom to select a specific calendar date.
*   **Hover**: Hover over an avatar to see the leader's name and position.

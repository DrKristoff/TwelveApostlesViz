import { useState, useEffect } from 'react';
import { Box, IconButton, Typography, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { parseISO, format, isValid } from 'date-fns';
import { useChurchLeadership, getAllEvents, getEventsOnDate } from '../hooks/useChurchLeadership';
import { LeadershipVisualizer } from './LeadershipVisualizer';

export const TimelineApp = () => {
    const [currentDate, setCurrentDate] = useState('2024-01-01');
    const [events, setEvents] = useState([]);
    const [dailyEvents, setDailyEvents] = useState([]);

    useEffect(() => {
        setEvents(getAllEvents());
    }, []);

    useEffect(() => {
        setDailyEvents(getEventsOnDate(currentDate));
    }, [currentDate]);

    const { firstPresidency, quorum } = useChurchLeadership(currentDate);

    const handlePrev = () => {
        const idx = events.findIndex(e => e >= currentDate);
        // If current date is exactly an event, go to previous index
        if (idx > 0) {
            setCurrentDate(events[idx - 1]);
        } else if (idx === -1) {
            // current date is after all events
            setCurrentDate(events[events.length - 1]);
        } else {
            // idx is 0, earliest event
            setCurrentDate(events[0]);
        }
    };

    const handleNext = () => {
        const idx = events.findIndex(e => e > currentDate);
        if (idx !== -1) {
            setCurrentDate(events[idx]);
        }
    };

    return (
        <Box sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#f5f5f5',
            overflow: 'hidden'
        }}>
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" component="h1">
                    LDS Leadership Timeline
                </Typography>
            </Box>

            {/* Visualization Area */}
            <Box sx={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <LeadershipVisualizer firstPresidency={firstPresidency} quorum={quorum} />
            </Box>

            {/* Event Description */}
            <Box sx={{ p: 2, textAlign: 'center', minHeight: '60px' }}>
                {dailyEvents.length > 0 ? (
                    dailyEvents.map((ev, i) => (
                        <Typography key={i} variant="subtitle1" color="primary" sx={{ fontWeight: 'bold' }}>
                            {ev}
                        </Typography>
                    ))
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        No recorded events on this date
                    </Typography>
                )}
            </Box>

            {/* Controls */}
            <Box sx={{
                p: 2,
                bgcolor: 'white',
                borderTop: '1px solid #ddd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
            }}>
                <IconButton onClick={handlePrev} size="large">
                    <ArrowBackIcon />
                </IconButton>

                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" display="block" color="text.secondary">
                        Current Date
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            value={parseISO(currentDate)}
                            onChange={(newValue) => {
                                if (isValid(newValue)) {
                                    setCurrentDate(format(newValue, 'yyyy-MM-dd'));
                                }
                            }}
                            renderInput={(params) => <TextField {...params} variant="standard" />}
                        />
                    </LocalizationProvider>
                </Box>

                <IconButton onClick={handleNext} size="large">
                    <ArrowForwardIcon />
                </IconButton>
            </Box>
        </Box>
    );
};

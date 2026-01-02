import { motion, AnimatePresence } from 'framer-motion';
import { Box, Avatar, Typography, Tooltip } from '@mui/material';

const AVATAR_SIZE = 60;
const RADIUS = 250;

const QuorumMember = ({ person, index, total }) => {
    // Calculate position on the circle
    // Start at -90 degrees (12 o'clock)
    const angle = (index / total) * 360 - 90;
    const radians = (angle * Math.PI) / 180;
    const x = RADIUS * Math.cos(radians);
    const y = RADIUS * Math.sin(radians);

    return (
        <motion.div
            layoutId={person.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: 1,
                scale: 1,
                x: x,
                y: y
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginLeft: -AVATAR_SIZE / 2,
                marginTop: -AVATAR_SIZE / 2,
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
                zIndex: 10
            }}
        >
            <Tooltip title={`${person.name} (${index + 1})`}>
                <Box sx={{ textAlign: 'center' }}>
                    <Avatar
                        src={person.imageUrl}
                        alt={person.name}
                        sx={{ width: AVATAR_SIZE, height: AVATAR_SIZE, border: '2px solid #1976d2' }}
                    />
                    <Typography variant="caption" sx={{
                        display: 'block',
                        fontSize: '0.6rem',
                        width: 80,
                        marginLeft: -1,
                        mt: 0.5,
                        textShadow: '0px 0px 4px white'
                    }}>
                        {person.name.replace(/^(Name: )/, '')}
                    </Typography>
                </Box>
            </Tooltip>
        </motion.div>
    );
};

const FirstPresidencyMember = ({ person, role }) => {
    return (
        <motion.div
            layoutId={person.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1.2, x: 0, y: 0 }} // Reset x/y for center layout
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 60, damping: 20 }}
            style={{ margin: '0 15px', zIndex: 20 }}
        >
            <Tooltip title={`${person.name} - ${role}`}>
                <Box sx={{ textAlign: 'center' }}>
                    <Avatar
                        src={person.imageUrl}
                        alt={person.name}
                        sx={{ width: AVATAR_SIZE + 20, height: AVATAR_SIZE + 20, border: '3px solid gold' }}
                    />
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
                        {role === 'President' ? 'President' : role.replace('Counselor', 'Couns.')}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                        {person.name.replace(/^(Name: )/, '')}
                    </Typography>
                </Box>
            </Tooltip>
        </motion.div>
    );
};

export const LeadershipVisualizer = ({ firstPresidency, quorum }) => {
    return (
        <Box sx={{ position: 'relative', width: RADIUS * 2 + 150, height: RADIUS * 2 + 150 }}>
            {/* Center: First Presidency */}
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 20
            }}>
                <AnimatePresence>
                    {firstPresidency.map(p => (
                        <FirstPresidencyMember key={p.id} person={p} role={p.roleDisplay} />
                    ))}
                </AnimatePresence>
            </Box>

            {/* Ring: Quorum */}
            <AnimatePresence>
                {quorum.map((p, index) => (
                    <QuorumMember
                        key={p.id}
                        person={p}
                        index={index}
                        total={quorum.length}
                    />
                ))}
            </AnimatePresence>
        </Box>
    );
};

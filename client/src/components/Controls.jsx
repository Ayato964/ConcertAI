import React from 'react';
import { Box, Button, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';

const Controls = ({ onPlay, onStop, isPlaying }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                my: 2,
                flexWrap: 'wrap',
            }}
        >
            <IconButton color="primary" onClick={onPlay} disabled={isPlaying}>
                <PlayArrowIcon />
            </IconButton>
            <IconButton onClick={onStop} disabled={!isPlaying}>
                <StopIcon />
            </IconButton>
            <Button
                variant="contained"
                color="secondary"
                sx={{ flexGrow: { xs: 1, sm: 0 } }}
            >
                Generate
            </Button>
        </Box>
    );
};

export default Controls;
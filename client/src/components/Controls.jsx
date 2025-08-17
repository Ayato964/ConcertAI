import React from 'react';
import { Box, Button, IconButton, Slider, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';

const Controls = ({ onPlay, onPause, onStop, playbackState, progress, duration }) => {
    return (
        <Box sx={{ my: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                }}
            >
                <IconButton color="primary" onClick={onPlay} disabled={playbackState === 'playing'}>
                    <PlayArrowIcon />
                </IconButton>
                <IconButton color="primary" onClick={onPause} disabled={playbackState !== 'playing'}>
                    <PauseIcon />
                </IconButton>
                <IconButton onClick={onStop} disabled={playbackState === 'stopped'}>
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
            <Box sx={{ mt: 2 }}>
                <Typography gutterBottom>Playback Progress</Typography>
                <Slider
                    value={progress}
                    max={1}
                    step={0.001}
                    aria-labelledby="playback-progress-slider"
                    disabled
                />
            </Box>
        </Box>
    );
};

export default Controls;
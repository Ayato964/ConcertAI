import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Slider, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const AdvancedSettings = ({ temperature, setTemperature, p, setP, numGems, setNumGems }) => {
    return (
        <Accordion sx={{ my: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Advanced Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box>
                    <Typography gutterBottom>Temperature</Typography>
                    <Slider
                        value={temperature}
                        onChange={(e, newValue) => setTemperature(newValue)}
                        step={0.05}
                        marks
                        min={0.1}
                        max={1.5}
                        valueLabelDisplay="auto"
                    />
                    <Typography gutterBottom>p (Top-p)</Typography>
                    <Slider
                        value={p}
                        onChange={(e, newValue) => setP(newValue)}
                        step={0.01}
                        marks
                        min={0.8}
                        max={1.0}
                        valueLabelDisplay="auto"
                    />
                    <Typography gutterBottom>Number of Gems</Typography>
                    <Slider
                        value={numGems}
                        onChange={(e, newValue) => setNumGems(newValue)}
                        step={1}
                        marks
                        min={1}
                        max={8}
                        valueLabelDisplay="auto"
                    />
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};

export default AdvancedSettings;
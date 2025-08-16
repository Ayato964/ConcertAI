import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Slider, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const AdvancedSettings = () => {
    return (
        <Accordion sx={{ my: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Advanced Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box>
                    <Typography gutterBottom>Temperature</Typography>
                    <Slider defaultValue={0.5} step={0.1} marks min={0.1} max={1.0} valueLabelDisplay="auto" />
                    <Typography gutterBottom>Number of Generations</Typography>
                    <FormControl fullWidth size="small">
                        <InputLabel>Count</InputLabel>
                        <Select defaultValue={3} label="Count">
                            <MenuItem value={1}>1</MenuItem>
                            <MenuItem value={2}>2</MenuItem>
                            <MenuItem value={3}>3</MenuItem>
                            <MenuItem value={4}>4</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};

export default AdvancedSettings;
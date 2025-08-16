import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const ModelSelector = () => {
    const models = [
        'MORTM 4omni - SAX',
        'MORTM 4 arrange - SAX',
        'MORTM 4 - PIANO'
    ];
    const [selectedModel, setSelectedModel] = React.useState(models[0]);

    const handleChange = (event) => {
        setSelectedModel(event.target.value);
    };

    return (
        <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Model</InputLabel>
            <Select
                value={selectedModel}
                label="Model"
                onChange={handleChange}
            >
                {models.map((model) => (
                    <MenuItem key={model} value={model}>{model}</MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export default ModelSelector;
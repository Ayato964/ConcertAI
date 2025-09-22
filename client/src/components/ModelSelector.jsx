import React, { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';

const ModelSelector = ({ selectedModel, setSelectedModel }) => {
    const [models, setModels] = useState([]);
    const [modelDescriptions, setModelDescriptions] = useState({});

    useEffect(() => {
        fetch('https://8d4f2be12ab2.ngrok-free.app/model_info', {
            method: 'POST',
        })
            .then(response => response.json())
            .then(data => {
                const modelNames = Object.values(data).map(model => model.model_name);
                const descriptions = Object.values(data).reduce((acc, model) => {
                    acc[model.model_name] = model.description;
                    return acc;
                }, {});
                setModels(modelNames);
                setModelDescriptions(descriptions);
                if (modelNames.length > 0 && !selectedModel) {
                    setSelectedModel(modelNames[0]);
                }
            })
            .catch(error => console.error('Error fetching models:', error));
    }, [selectedModel, setSelectedModel]);

    const handleChange = (event) => {
        setSelectedModel(event.target.value);
    };

    return (
        <FormControl fullWidth margin="normal">
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
            {selectedModel && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                    {modelDescriptions[selectedModel]}
                </Typography>
            )}
        </FormControl>
    );
};

export default ModelSelector;
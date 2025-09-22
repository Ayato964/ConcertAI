import React, { useState, useEffect } from 'react';
import { FormControl, RadioGroup, FormControlLabel, Radio, Typography, Box } from '@mui/material';

const ModelSelector = ({ selectedModel, setSelectedModel }) => {
    const [models, setModels] = useState([]);

    useEffect(() => {
        fetch('https://8d4f2be12ab2.ngrok-free.app/model_info', {
            method: 'POST',
        })
            .then(response => response.json())
            .then(data => {
                const modelData = Object.values(data);
                setModels(modelData);
                if (modelData.length > 0 && !selectedModel) {
                    setSelectedModel(modelData[0].model_name);
                }
            })
            .catch(error => console.error('Error fetching models:', error));
    }, [selectedModel, setSelectedModel]);

    const handleChange = (event) => {
        setSelectedModel(event.target.value);
    };

    return (
        <FormControl component="fieldset" fullWidth margin="normal">
            <RadioGroup
                aria-label="model"
                name="model-selector"
                value={selectedModel}
                onChange={handleChange}
            >
                {models.map((model) => (
                    <FormControlLabel 
                        key={model.model_name} 
                        value={model.model_name} 
                        control={<Radio />} 
                        label={
                            <Box>
                                <Typography variant="subtitle1">Model: {model.model_name}</Typography>
                                <Typography variant="body2">Description: {model.description}</Typography>
                                <Typography variant="caption">Instruments: {model.tag.instrument}</Typography>
                            </Box>
                        }
                    />
                ))}
            </RadioGroup>
        </FormControl>
    );
};

export default ModelSelector;
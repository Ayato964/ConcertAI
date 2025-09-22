import React, { useState, useEffect } from 'react';
import { Typography, Box, Button, Drawer } from '@mui/material';
import { modelsData } from '../models.js';

const ModelSelector = ({ selectedModel, setSelectedModel }) => {
    const [models, setModels] = useState(modelsData);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        if (models.length > 0 && !selectedModel) {
            setSelectedModel(models[0].model_name);
        }
    }, [models, selectedModel, setSelectedModel]);

    const handleModelSelect = (modelName) => {
        setSelectedModel(modelName);
        setDrawerOpen(false);
    };

    const selectedModelObject = models.find(m => m.model_name === selectedModel);

    const modelList = (
        <Box sx={{ width: 350, p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Select a Model</Typography>
            {models.map((model) => (
                <Button
                    key={model.model_name}
                    onClick={() => handleModelSelect(model.model_name)}
                    variant="outlined"
                    fullWidth
                    sx={{
                        mb: 2,
                        border: selectedModel === model.model_name ? '2px solid' : '1px solid',
                        borderColor: selectedModel === model.model_name ? 'primary.main' : 'grey.400',
                        textTransform: 'none',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '16px',
                        '&.MuiButton-root': {
                            justifyContent: 'flex-start',
                        }
                    }}
                >
                    <Typography component="span" variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {model.model_name}
                    </Typography>
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {model.description}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ mt: 1.5 }}>
                        Instruments: {model?.tag?.instrument}
                    </Typography>
                </Button>
            ))}
        </Box>
    );

    return (
        <Box sx={{ width: '100%', my: 2 }}>
            {selectedModelObject && (
                 <Box>
                    <Typography variant="overline" color="text.secondary">Model</Typography>
                    <Button
                        onClick={() => setDrawerOpen(true)}
                        variant="outlined"
                        fullWidth
                        sx={{
                            border: '1px solid',
                            borderColor: 'grey.400',
                            textTransform: 'none',
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: '16px',
                            '&.MuiButton-root': {
                                justifyContent: 'flex-start',
                            }
                        }}
                    >
                        <Typography component="span" variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {selectedModelObject.model_name}
                        </Typography>
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {selectedModelObject.description}
                        </Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ mt: 1.5 }}>
                            Instruments: {selectedModelObject?.tag?.instrument}
                        </Typography>
                    </Button>
                </Box>
            )}

            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                {modelList}
            </Drawer>
        </Box>
    );
};

export default ModelSelector;
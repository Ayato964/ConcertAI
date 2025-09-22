import React, { useState, useEffect } from 'react';
import { Typography, Box, CircularProgress, Alert, Button, Drawer } from '@mui/material';

const ModelSelector = ({ selectedModel, setSelectedModel }) => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await fetch('/api/model_info', {
                    method: 'POST',
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                const modelData = Object.values(data);
                setModels(modelData);
                if (modelData.length > 0 && !selectedModel) {
                    setSelectedModel(modelData[0].model_name);
                }
            } catch (e) {
                setError(e.message);
                console.error('Error fetching models:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchModels();
    }, [selectedModel, setSelectedModel]);

    const handleModelSelect = (modelName) => {
        setSelectedModel(modelName);
        setDrawerOpen(false);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="150px">
                <CircularProgress />
                <Typography ml={2}>Loading models...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error">
                Failed to load models: {error}
            </Alert>
        );
    }

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
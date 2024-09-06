import React, { useState } from 'react';
import { Modal, Box, TextField, Tooltip } from '@mui/material';
import {Settings} from '@mui/icons-material';
import { saveEnvVal, getEnvVal } from '../../util/util';
import DatabaseManager from '../../db/database-manager';
import './api-input.scss';
import '../../db/database-manager';

//设置按钮
export function ApiInputModal() {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const apiToken = data.get('openai-api');
    const batchSize = data.get('batch-size');
    const dimensionSize = data.get('num-dims');
    // save data into env variables
    if(apiToken !== "ExampleKey") {
      //保存LLM的Key，当不是ExampleKey的时候
      saveEnvVal('VITE_OPENAI_API_KEY', apiToken as string);
    }
    DatabaseManager.setBatchSize(batchSize as string);
    DatabaseManager.setDimensionSize(dimensionSize as string);
    handleClose();
  };

  return (
    <div>
      <Tooltip title="Settings">
        <button className="api-input-button" onClick={handleOpen}>
              <Settings style={{color: '#aaa'}} />
        </button>
      </Tooltip>
      
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="setting-modal"
        aria-describedby="setting-modal-api-key-and-batch-size"
        className='api-input-modal'
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 3
          }}
        >
          <h4>Settings</h4>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              variant="outlined"
              margin="normal"
              fullWidth
              id="openai-api"
              label="Enter your OpenAPI Key"
              name="openai-api"
              defaultValue={"ExampleKey"}
              autoFocus
            />
            <TextField
              variant="outlined"
              margin="normal"
              fullWidth
              id="batch-size"
              label="Generation Batch Size"
              defaultValue={DatabaseManager.getBatchSize()}
              name="batch-size"
            />
            <TextField
              variant="outlined"
              margin="normal"
              fullWidth
              id="num-dims"
              label="Number of Dimensions"
              defaultValue={DatabaseManager.getDimensionSize()}
              name="num-dims"
            />
            <p className='note'>
              Luminate will not save your OpenAI API key neither in a cookie, localStorage, nor server. 
              You will need to enter it every time you open the app.
              You may also download the source code and run it locally.
            </p>
            <button type="submit" className='submit-button'>
              Save
            </button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
}



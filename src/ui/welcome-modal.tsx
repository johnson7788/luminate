// 页面加载时，WelcomeModal 会自动弹出。
// 用户输入 OpenAI API Key 并提交表单后，API Key 被保存为环境变量，模态框关闭。
// 如果用户按下 Escape 键关闭模态框，系统会提示用户必须设置 API Key 才能继续使用应用。
import './welcome-modal.scss';
import React, { useState } from 'react';
import { Modal, Box, TextField} from '@mui/material';
import { saveEnvVal } from '../util/util';
import * as bootstrap from 'bootstrap';

export function WelcomeModal( {updateApiKey}){
  const [open, setOpen] = useState(true);

  const handleClose = (event, reason) => {
    if (reason !== 'backdropClick') {
      setOpen(false);
    }
    if (reason === 'escapeKeyDown') {
      setOpen(false);
      // use the toast to notify the user to set up the API key
      let toast = new bootstrap.Toast(document.getElementById('fav-toast'));
      var msg = document.getElementById('toast-text');
      if (msg) {
        msg.textContent =  "You need to set up the OpenAI API key to use Luminate. Please click on the settings icon in the top right corner to set it up.";
        toast.show();
      }
    }
  }

  const handleSubmit = (event,reason) => {
    event.preventDefault();
    const data = new FormData(event.target);
    const apiToken = data.get('openai-api');
    // save data into env variables
    saveEnvVal('VITE_OPENAI_API_KEY', apiToken as string);
    handleClose(event,reason);
    updateApiKey(apiToken as string);
  };

  //Material UI 的 Modal、Box 和 TextField 组件，以及 Bootstrap 的 Toast 组件
  return (
    <div className="welcome-modal">
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
            width: 600,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 3
          }}
        >
          <h4>Welcome to Luminate 👋</h4>
          <p>
            Luminate is a research prototype for human-AI text-based co-creation powered by GPT 3.5.
            To start off, please enter your OpenAI API Key in the text field below.
          </p>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              variant="outlined"
              margin="normal"
              required
              fullWidth
              id="openai-api"
              label="Enter your OpenAPI Key"
              name="openai-api"
              autoFocus
            />
            <p className='note'>
              You can find your Secret OpenAI API key in your <a href="https://platform.openai.com/account/api-keys" target="_blank">User Settings</a>
            </p>
            <p className='note'>
              Generate one response in the design space costs about $0.007. By default, Luminate will generate 20 responses at a time which costs about $0.14.
              You can modify the batch size by opening Settings <img src="settings-menu.png" alt="Settings" style={{width: '30px', height: '30px'}}/> in the top right corner.
              Detailed information about the cost can be found in  <a href="https://openai.com/pricing" target="_blank">Pricing</a>
            </p>
            <p className='note'>
              Luminate will not save your OpenAI API key neither in a cookie, localStorage, nor server. 
              You will need to enter it every time you open the app.
              You may also download the source code and run it locally.
            </p>
            <button type="submit" className='submit-button'>
              Play Luminate <img src="/luminate-logo.svg" style={{maxHeight: '24px'}} alt="arrow-right" />
            </button>
          </Box>
        </Box>
      </Modal>
    </div>
  );
}
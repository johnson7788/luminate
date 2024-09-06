import React from 'react';
//定义了一个 React 组件 ToastContainer，用于在屏幕的固定位置显示两个不同的 Bootstrap Toast 消息。
//ToastContainer 组件定义了两个 Bootstrap Toast 消息，分别用于显示成功消息和错误消息。组件使用了 className 属性和 Bootstrap 的 CSS 类来样式化 Toast 消息。组件内部的 Toast 消息和按钮均使用了 Bootstrap 的样式和属性来确保其功能性和美观性。
export const ToastContainer = (favtext = "Successfully added text to My Favourite", errortext = "Maximum 2 Dimensions") => {
  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3" id="toast-container">
      {/* Favorite toast */}
      <div id="fav-toast" className="toast align-items-center text-bg-secondary border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div className="d-flex">
          <div className="toast-body" id="toast-text">
          Successfully added text to My Favourite
          </div>
          <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
      {/* Error toast */}
      <div id="error-toast" className="toast align-items-center text-bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div className="d-flex">
          <div className="toast-body" id="error-toast-text">
          Maximum 2 Dimensions
          </div>
          <button type="button" className="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    </div>
  );
};

export default ToastContainer;

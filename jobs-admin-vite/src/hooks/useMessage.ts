import { App } from 'antd';

export const useMessage = () => {
  const { message, notification, modal } = App.useApp();
  return { message, notification, modal };
};

export default useMessage;

import React from 'react';

/**
 * Componente de iconos SVG para controles de videollamada
 * Acepta width y height como props para personalizar el tamaño
 */

export const MicIconActive = ({ width = 24, height = 24, stroke = "white", strokeWidth = 2 }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 19V22M12 19C13.8565 19 15.637 18.2625 16.9497 16.9497C18.2625 15.637 19 13.8565 19 12V10M12 19C10.1435 19 8.36301 18.2625 7.05025 16.9497C5.7375 15.637 5 13.8565 5 12V10M12 2C13.6569 2 15 3.34315 15 5V12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12V5C9 3.34315 10.3431 2 12 2Z" 
      stroke={stroke} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const MicIconInactive = ({ width = 24, height = 24, stroke = "white", strokeWidth = 1.5 }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M2 2L22 22M18.89 13.23C18.9622 12.824 18.999 12.4124 19 12V10M5.00001 10V12C4.97966 13.3992 5.37913 14.7723 6.14684 15.9422C6.91456 17.1121 8.01529 18.0251 9.30696 18.5633C10.5986 19.1015 12.022 19.2402 13.3933 18.9616C14.7645 18.6829 16.0208 17.9997 17 17M14.9999 9.33999V4.99999C14.9959 4.32636 14.7652 3.6737 14.3451 3.14711C13.925 2.62053 13.3399 2.25066 12.684 2.09708C12.0281 1.94349 11.3396 2.01514 10.7293 2.30046C10.1191 2.58579 9.62265 3.06819 9.31995 3.66999M9 9V12C9.00052 12.593 9.17675 13.1725 9.50643 13.6653C9.83611 14.1582 10.3045 14.5423 10.8523 14.7691C11.4002 14.996 12.0029 15.0554 12.5845 14.9399C13.1661 14.8243 13.7005 14.539 14.12 14.12M12 19V22" 
      stroke={stroke} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const ShareScreenIcon = ({ width = 24, height = 24, stroke = "white", strokeWidth = 1.5 }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M13 3H4C3.46957 3 2.96086 3.21071 2.58579 3.58579C2.21071 3.96086 2 4.46957 2 5V15C2 15.5304 2.21071 16.0391 2.58579 16.4142C2.96086 16.7893 3.46957 17 4 17H20C20.5304 17 21.0391 16.7893 21.4142 16.4142C21.7893 16.0391 22 15.5304 22 15V12M8 21H16M12 17V21M17 8L22 3M22 3H17M22 3V8" 
      stroke={stroke} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const ChatIcon = ({ width = 24, height = 24, stroke = "white", strokeWidth = 1.5 }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M7.99976 11.9998H8.00976M11.9998 11.9998H12.0098M15.9998 11.9998H16.0098M2.99169 16.3417C3.13873 16.7126 3.17147 17.119 3.08569 17.5087L2.02069 20.7987C1.98638 20.9655 1.99525 21.1384 2.04647 21.3008C2.09769 21.4633 2.18955 21.61 2.31336 21.727C2.43716 21.844 2.5888 21.9274 2.75389 21.9693C2.91898 22.0113 3.09205 22.0104 3.25669 21.9667L6.66969 20.9687C7.03741 20.8958 7.41822 20.9276 7.76869 21.0607C9.90408 22.0579 12.3231 22.2689 14.5988 21.6564C16.8746 21.0439 18.861 19.6473 20.2074 17.7131C21.5538 15.7788 22.1738 13.4311 21.958 11.0842C21.7422 8.73738 20.7044 6.54216 19.0278 4.88589C17.3511 3.22962 15.1434 2.21873 12.7941 2.03159C10.4448 1.84445 8.10483 2.49308 6.18713 3.86303C4.26944 5.23299 2.89722 7.23624 2.31258 9.51933C1.72795 11.8024 1.96846 14.2186 2.99169 16.3417Z" 
      stroke={stroke} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const CameraIconActive = ({ width = 24, height = 24, stroke = "white", strokeWidth = 1.5 }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M16 12.9998L21.223 16.4818C21.2983 16.5319 21.3858 16.5606 21.4761 16.5649C21.5664 16.5693 21.6563 16.549 21.736 16.5063C21.8157 16.4636 21.8824 16.4001 21.9289 16.3225C21.9754 16.245 22 16.1562 22 16.0658V7.86978C22 7.7818 21.9768 7.69537 21.9328 7.61922C21.8887 7.54308 21.8253 7.4799 21.7491 7.43608C21.6728 7.39225 21.5863 7.36933 21.4983 7.36963C21.4103 7.36993 21.324 7.39344 21.248 7.43778L16 10.4998M4 6H14C15.1046 6 16 6.89543 16 8V16C16 17.1046 15.1046 18 14 18H4C2.89543 18 2 17.1046 2 16V8C2 6.89543 2.89543 6 4 6Z" 
      stroke={stroke} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const CameraIconInactive = ({ width = 24, height = 24, stroke = "white", strokeWidth = 1.5 }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M10.66 6H14C14.5305 6 15.0392 6.21071 15.4142 6.58579C15.7893 6.96086 16 7.46957 16 8V10.5L21.248 7.438C21.324 7.39366 21.4104 7.37015 21.4983 7.36985C21.5863 7.36956 21.6728 7.39248 21.7491 7.4363C21.8254 7.48012 21.8888 7.5433 21.9328 7.61945C21.9769 7.6956 22.0001 7.78202 22 7.87V16.066M16 16C16 16.5304 15.7893 17.0391 15.4142 17.4142C15.0391 17.7893 14.5304 18 14 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V8C2 7.46957 2.21071 6.96086 2.58579 6.58579C2.96086 6.21071 3.46957 6 4 6H6M2 2L22 22" 
      stroke={stroke} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const ClipIcon = ({ width = 24, height = 24, stroke = "#5C5C5C", strokeWidth = 2 }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M15.9991 5.9996L7.58505 14.5856C7.2099 14.9608 6.99915 15.4696 6.99915 16.0001C6.99915 16.5306 7.2099 17.0395 7.58505 17.4146C7.9602 17.7898 8.46901 18.0005 8.99955 18.0005C9.53009 18.0005 10.0389 17.7898 10.4141 17.4146L18.8281 8.8286C19.5782 8.07844 19.9997 7.061 19.9997 6.0001C19.9997 4.93921 19.5782 3.92177 18.8281 3.1716C18.0779 2.42144 17.0604 2 15.9996 2C14.9387 2 13.9212 2.42144 13.1711 3.1716L4.79205 11.7226C4.22745 12.2781 3.77842 12.9399 3.47085 13.6697C3.16328 14.3996 3.00327 15.1832 3.00005 15.9752C2.99682 16.7673 3.15045 17.5521 3.45206 18.2845C3.75367 19.0168 4.1973 19.6822 4.75736 20.2423C5.31742 20.8024 5.98282 21.246 6.71519 21.5476C7.44756 21.8492 8.23239 22.0028 9.02443 21.9996C9.81647 21.9964 10.6 21.8364 11.3299 21.5288C12.0598 21.2212 12.7216 20.7722 13.2771 20.2076L21.656 11.6566" 
      stroke={stroke} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const SendArrowIcon = ({ width = 24, height = 24, stroke = "white", strokeWidth = 2 }) => (
  <svg width={width} height={height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M9 18L15 12L9 6" 
      stroke={stroke} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const UserIcon = ({ width = 20, height = 20, stroke = "#5C5C5C", strokeWidth = 2 }) => (
  <svg width={width} height={height} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M15.8327 17.5V15.8333C15.8327 14.9493 15.4815 14.1014 14.8564 13.4763C14.2312 12.8512 13.3834 12.5 12.4993 12.5H7.49935C6.61529 12.5 5.76745 12.8512 5.14233 13.4763C4.5172 14.1014 4.16602 14.9493 4.16602 15.8333V17.5M13.3327 5.83333C13.3327 7.67428 11.8403 9.16667 9.99935 9.16667C8.1584 9.16667 6.66602 7.67428 6.66602 5.83333C6.66602 3.99238 8.1584 2.5 9.99935 2.5C11.8403 2.5 13.3327 3.99238 13.3327 5.83333Z" 
      stroke={stroke} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

export const CloseXIcon = ({ width = 20, height = 20, stroke = "#5C5C5C", strokeWidth = 2 }) => (
  <svg width={width} height={height} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M15 5L5 15M5 5L15 15" 
      stroke={stroke} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);


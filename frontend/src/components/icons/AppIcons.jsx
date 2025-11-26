import React from 'react';

/**
 * Iconos generales de la aplicación
 * Todos los iconos aceptan: width, height, stroke (color de línea), fill (color de fondo)
 */

// Icono de Inicio (casita)
export const HomeIcon = ({ 
  width = 20, 
  height = 20, 
  stroke = "#9A9A9A", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 20 20" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path 
      d="M7 19V13C7 12.4696 7.21071 11.9609 7.58579 11.5858C7.96086 11.2107 8.46957 11 9 11H11C11.5304 11 12.0391 11.2107 12.4142 11.5858C12.7893 11.9609 13 12.4696 13 13V19M3 10H1L10 1L19 10H17V17C17 17.5304 16.7893 18.0391 16.4142 18.4142C16.0391 18.7893 15.5304 19 15 19H5C4.46957 19 3.96086 18.7893 3.58579 18.4142C3.21071 18.0391 3 17.5304 3 17V10Z" 
      stroke={stroke} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Icono de Usuarios/Pacientes (personitas)
export const UsersIcon = ({ 
  width = 20, 
  height = 20, 
  stroke = "#9A9A9A", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 20 20" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path 
      d="M1 19V17C1 15.9391 1.42143 14.9217 2.17157 14.1716C2.92172 13.4214 3.93913 13 5 13H9C10.0609 13 11.0783 13.4214 11.8284 14.1716C12.5786 14.9217 13 15.9391 13 17V19M14 1.12988C14.8604 1.35018 15.623 1.85058 16.1676 2.55219C16.7122 3.2538 17.0078 4.11671 17.0078 5.00488C17.0078 5.89305 16.7122 6.75596 16.1676 7.45757C15.623 8.15918 14.8604 8.65958 14 8.87988M19 18.9999V16.9999C18.9949 16.1171 18.6979 15.2607 18.1553 14.5643C17.6126 13.8679 16.8548 13.3706 16 13.1499M3 5C3 6.06087 3.42143 7.07828 4.17157 7.82843C4.92172 8.57857 5.93913 9 7 9C8.06087 9 9.07828 8.57857 9.82843 7.82843C10.5786 7.07828 11 6.06087 11 5C11 3.93913 10.5786 2.92172 9.82843 2.17157C9.07828 1.42143 8.06087 1 7 1C5.93913 1 4.92172 1.42143 4.17157 2.17157C3.42143 2.92172 3 3.93913 3 5Z" 
      stroke={stroke} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Icono de Calendario/Agenda
export const CalendarIcon = ({ 
  width = 18, 
  height = 20, 
  stroke = "#9A9A9A", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 18 20" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path 
      d="M13 1V5M5 1V5M1 9H17M8 13H9V16M1 5C1 4.46957 1.21071 3.96086 1.58579 3.58579C1.96086 3.21071 2.46957 3 3 3H15C15.5304 3 16.0391 3.21071 16.4142 3.58579C16.7893 3.96086 17 4.46957 17 5V17C17 17.5304 16.7893 18.0391 16.4142 18.4142C16.0391 18.7893 15.5304 19 15 19H3C2.46957 19 1.96086 18.7893 1.58579 18.4142C1.21071 18.0391 1 17.5304 1 17V5Z" 
      stroke={stroke} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Icono de Menu Sidebar
export const MenuSidebarIcon = ({ 
  width = 44, 
  height = 44, 
  stroke = "#3E6BF7", 
  fill = "#F9F9F9",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 44 44" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path 
      d="M44 22C44 9.84974 34.1503 0 22 0H0V44H22C34.1503 44 44 34.1503 44 22Z" 
      fill={fill}
    />
    <path 
      d="M29 13H15C13.8954 13 13 13.8954 13 15V29C13 30.1046 13.8954 31 15 31H29C30.1046 31 31 30.1046 31 29V15C31 13.8954 30.1046 13 29 13Z" 
      stroke={stroke} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M19 13V31" 
      stroke={stroke} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Icono de Reloj/Horario (para sala de espera)
export const ClockIcon = ({ 
  width = 16, 
  height = 16, 
  stroke = "#90A1B9", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 16 16" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <g clipPath="url(#clip_clock)">
      <path 
        d="M8 4V8L10.6667 9.33333" 
        stroke={stroke} 
        strokeWidth="1.33333" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M7.99967 14.6673C11.6816 14.6673 14.6663 11.6825 14.6663 8.00065C14.6663 4.31875 11.6816 1.33398 7.99967 1.33398C4.31778 1.33398 1.33301 4.31875 1.33301 8.00065C1.33301 11.6825 4.31778 14.6673 7.99967 14.6673Z" 
        stroke={stroke} 
        strokeWidth="1.33333" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip_clock">
        <rect width="16" height="16" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

// Icono de Paciente (persona en círculo)
export const PatientIcon = ({ 
  width = 16, 
  height = 16, 
  stroke = "#90A1B9", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 16 16" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <g clipPath="url(#clip_patient)">
      <path 
        d="M7.99967 14.6673C11.6816 14.6673 14.6663 11.6825 14.6663 8.00065C14.6663 4.31875 11.6816 1.33398 7.99967 1.33398C4.31778 1.33398 1.33301 4.31875 1.33301 8.00065C1.33301 11.6825 4.31778 14.6673 7.99967 14.6673Z" 
        stroke={stroke} 
        strokeWidth="1.33333" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M8 8.66602C9.10457 8.66602 10 7.77059 10 6.66602C10 5.56145 9.10457 4.66602 8 4.66602C6.89543 4.66602 6 5.56145 6 6.66602C6 7.77059 6.89543 8.66602 8 8.66602Z" 
        stroke={stroke} 
        strokeWidth="1.33333" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M4.66699 13.7753V12.6673C4.66699 12.3137 4.80747 11.9746 5.05752 11.7245C5.30756 11.4745 5.6467 11.334 6.00033 11.334H10.0003C10.3539 11.334 10.6931 11.4745 10.9431 11.7245C11.1932 11.9746 11.3337 12.3137 11.3337 12.6673V13.7753" 
        stroke={stroke} 
        strokeWidth="1.33333" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip_patient">
        <rect width="16" height="16" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

// Icono de Doctor (estetoscopio)
export const DoctorIcon = ({ 
  width = 16, 
  height = 16, 
  stroke = "#90A1B9", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 16 16" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <g clipPath="url(#clip_doctor)">
      <path d="M7.33301 1.33398V2.66732" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.33301 1.33398V2.66732" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path 
        d="M3.33301 2H2.66634C2.31272 2 1.97358 2.14048 1.72353 2.39052C1.47348 2.64057 1.33301 2.97971 1.33301 3.33333V6C1.33301 7.06087 1.75444 8.07828 2.50458 8.82843C3.25473 9.57857 4.27214 10 5.33301 10C6.39387 10 7.41129 9.57857 8.16144 8.82843C8.91158 8.07828 9.33301 7.06087 9.33301 6V3.33333C9.33301 2.97971 9.19253 2.64057 8.94248 2.39052C8.69243 2.14048 8.3533 2 7.99967 2H7.33301" 
        stroke={stroke} 
        strokeWidth="1.33333" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M5.33301 10C5.33301 11.0609 5.75444 12.0783 6.50458 12.8284C7.25473 13.5786 8.27214 14 9.33301 14C10.3939 14 11.4113 13.5786 12.1614 12.8284C12.9116 12.0783 13.333 11.0609 13.333 10V8" 
        stroke={stroke} 
        strokeWidth="1.33333" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M13.3333 8.00065C14.0697 8.00065 14.6667 7.4037 14.6667 6.66732C14.6667 5.93094 14.0697 5.33398 13.3333 5.33398C12.597 5.33398 12 5.93094 12 6.66732C12 7.4037 12.597 8.00065 13.3333 8.00065Z" 
        stroke={stroke} 
        strokeWidth="1.33333" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip_doctor">
        <rect width="16" height="16" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

// Icono de Consulta (documento)
export const ConsultIcon = ({ 
  width = 16, 
  height = 16, 
  stroke = "#90A1B9", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 16 16" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path 
      d="M10.0003 1.33398H4.00033C3.6467 1.33398 3.30756 1.47446 3.05752 1.72451C2.80747 1.97456 2.66699 2.3137 2.66699 2.66732V13.334C2.66699 13.6876 2.80747 14.0267 3.05752 14.2768C3.30756 14.5268 3.6467 14.6673 4.00033 14.6673H12.0003C12.3539 14.6673 12.6931 14.5268 12.9431 14.2768C13.1932 14.0267 13.3337 13.6876 13.3337 13.334V4.66732L10.0003 1.33398Z" 
      stroke={stroke} 
      strokeWidth="1.33333" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M9.33301 1.33398V4.00065C9.33301 4.35427 9.47348 4.69341 9.72353 4.94346C9.97358 5.19351 10.3127 5.33398 10.6663 5.33398H13.333" 
      stroke={stroke} 
      strokeWidth="1.33333" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path d="M6.66634 6H5.33301" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.6663 8.66602H5.33301" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.6663 11.334H5.33301" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Icono de Videollamada/Empezar consulta
export const VideoCallIcon = ({ 
  width = 18, 
  height = 18, 
  stroke = "white", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 18 18" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path 
      d="M11.6663 9.479L15.4748 12.018C15.5297 12.0545 15.5935 12.0755 15.6593 12.0786C15.7252 12.0818 15.7907 12.067 15.8488 12.0359C15.907 12.0047 15.9556 11.9584 15.9895 11.9018C16.0234 11.8453 16.0413 11.7806 16.0413 11.7146V5.73838C16.0414 5.67423 16.0245 5.61121 15.9923 5.55568C15.9602 5.50016 15.914 5.45409 15.8584 5.42214C15.8027 5.39018 15.7397 5.37347 15.6755 5.37369C15.6114 5.37391 15.5484 5.39105 15.493 5.42338L11.6663 7.65609M2.91634 4.375H10.208C11.0134 4.375 11.6663 5.02792 11.6663 5.83333V11.6667C11.6663 12.4721 11.0134 13.125 10.208 13.125H2.91634C2.11093 13.125 1.45801 12.4721 1.45801 11.6667V5.83333C1.45801 5.02792 2.11093 4.375 2.91634 4.375Z" 
      stroke={stroke} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Icono de Micrófono (Tab Consulta)
export const MicrophoneIcon = ({ 
  width = 16, 
  height = 16, 
  stroke = "#6A7282", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 16 16" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path d="M8 12.6641V14.6641" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12.6663 6.66406V7.9974C12.6663 9.23507 12.1747 10.4221 11.2995 11.2972C10.4243 12.1724 9.23735 12.6641 7.99967 12.6641C6.762 12.6641 5.57501 12.1724 4.69984 11.2972C3.82467 10.4221 3.33301 9.23507 3.33301 7.9974V6.66406" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 3.33594C10 2.23137 9.10457 1.33594 8 1.33594C6.89543 1.33594 6 2.23137 6 3.33594V8.0026C6 9.10717 6.89543 10.0026 8 10.0026C9.10457 10.0026 10 9.10717 10 8.0026V3.33594Z" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Icono de Cerebro (Tab Diagnóstico)
export const BrainIcon = ({ 
  width = 16, 
  height = 16, 
  stroke = "#6A7282", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 16 16" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <g clipPath="url(#clip_brain)">
      <path d="M8.32812 12.0026V3.33594" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.3281 8.66667C9.75132 8.49806 9.24469 8.14708 8.88412 7.66633C8.52356 7.18558 8.32849 6.60094 8.32813 6C8.32776 6.60094 8.13269 7.18558 7.77213 7.66633C7.41156 8.14708 6.90493 8.49806 6.32812 8.66667" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.0601 4.33603C12.2135 4.07035 12.3038 3.77295 12.3238 3.46682C12.3439 3.1607 12.2933 2.85405 12.1759 2.57062C12.0585 2.28719 11.8775 2.03456 11.6468 1.83228C11.4162 1.63 11.1421 1.48349 10.8458 1.40409C10.5494 1.32469 10.2388 1.31452 9.93793 1.37437C9.63704 1.43422 9.35395 1.56249 9.11057 1.74926C8.86719 1.93602 8.67003 2.17627 8.53435 2.45142C8.39867 2.72657 8.32811 3.02924 8.32813 3.33603C8.32814 3.02924 8.25758 2.72657 8.1219 2.45142C7.98622 2.17627 7.78906 1.93602 7.54568 1.74926C7.3023 1.56249 7.01921 1.43422 6.71832 1.37437C6.41743 1.31452 6.10681 1.32469 5.81048 1.40409C5.51415 1.48349 5.24006 1.63 5.00941 1.83228C4.77876 2.03456 4.59774 2.28719 4.48035 2.57062C4.36295 2.85405 4.31234 3.1607 4.33241 3.46682C4.35249 3.77295 4.44272 4.07035 4.59613 4.33603" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.3262 3.41406C12.718 3.51482 13.0818 3.70343 13.39 3.9656C13.6982 4.22778 13.9427 4.55664 14.1049 4.92729C14.2672 5.29794 14.343 5.70066 14.3266 6.10494C14.3102 6.50922 14.202 6.90446 14.0102 7.26073" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.3281 11.9994C12.9151 11.9994 13.4857 11.8057 13.9514 11.4483C14.4171 11.091 14.7519 10.59 14.9038 10.023C15.0557 9.45596 15.0163 8.85467 14.7917 8.31235C14.5671 7.77002 14.1698 7.31696 13.6615 7.02344" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.6398 11.6562C13.6865 12.0177 13.6586 12.385 13.5579 12.7353C13.4571 13.0856 13.2856 13.4115 13.0539 13.6929C12.8223 13.9743 12.5354 14.2052 12.211 14.3714C11.8866 14.5376 11.5315 14.6355 11.1678 14.6591C10.8041 14.6827 10.4394 14.6315 10.0962 14.5087C9.75303 14.3858 9.4387 14.1939 9.17261 13.9448C8.90652 13.6956 8.69433 13.3946 8.54914 13.0603C8.40395 12.726 8.32884 12.3654 8.32845 12.0009C8.32806 12.3654 8.25295 12.726 8.10776 13.0603C7.96257 13.3946 7.75038 13.6956 7.48429 13.9448C7.2182 14.1939 6.90387 14.3858 6.56071 14.5087C6.21754 14.6315 5.85283 14.6827 5.4891 14.6591C5.12537 14.6355 4.77033 14.5376 4.44593 14.3714C4.12152 14.2052 3.83463 13.9743 3.60297 13.6929C3.37131 13.4115 3.19981 13.0856 3.09904 12.7353C2.99828 12.385 2.97039 12.0177 3.01712 11.6562" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.32768 11.9994C3.74068 11.9994 3.17009 11.8057 2.70439 11.4483C2.2387 11.091 1.90393 10.59 1.752 10.023C1.60007 9.45596 1.63947 8.85467 1.86409 8.31235C2.08872 7.77002 2.48601 7.31696 2.99435 7.02344" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.32975 3.41406C3.93789 3.51482 3.57409 3.70343 3.26591 3.9656C2.95773 4.22778 2.71325 4.55664 2.55098 4.92729C2.38872 5.29794 2.31293 5.70066 2.32935 6.10494C2.34576 6.50922 2.45397 6.90446 2.64575 7.26073" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
    <defs>
      <clipPath id="clip_brain">
        <rect width="16" height="16" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

// Icono de Documento (Tab Finalizar)
export const DocumentIcon = ({ 
  width = 16, 
  height = 16, 
  stroke = "#6A7282", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 16 16" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path d="M11.0316 1.33594H5.03158C4.67795 1.33594 4.33881 1.47641 4.08877 1.72646C3.83872 1.97651 3.69824 2.31565 3.69824 2.66927V13.3359C3.69824 13.6896 3.83872 14.0287 4.08877 14.2787C4.33881 14.5288 4.67795 14.6693 5.03158 14.6693H13.0316C13.3852 14.6693 13.7243 14.5288 13.9744 14.2787C14.2244 14.0287 14.3649 13.6896 14.3649 13.3359V4.66927L11.0316 1.33594Z" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.3643 1.33594V4.0026C10.3643 4.35623 10.5047 4.69536 10.7548 4.94541C11.0048 5.19546 11.344 5.33594 11.6976 5.33594H14.3643" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.69759 6H6.36426" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.6976 8.66406H6.36426" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.6976 11.3359H6.36426" stroke={stroke} strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Icono de Alergias (triángulo de advertencia)
export const AllergyIcon = ({ 
  width = 14, 
  height = 13, 
  stroke = "#FF0000", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 14 13" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path d="M12.6632 9.84269L7.89526 1.49881C7.7913 1.31536 7.64054 1.16278 7.45835 1.05662C7.27617 0.950463 7.06909 0.894531 6.85823 0.894531C6.64738 0.894531 6.4403 0.950463 6.25812 1.05662C6.07593 1.16278 5.92517 1.31536 5.82121 1.49881L1.05328 9.84269C0.948194 10.0247 0.893092 10.2312 0.893558 10.4414C0.894023 10.6515 0.950039 10.8578 1.05593 11.0393C1.16182 11.2209 1.31381 11.3712 1.49651 11.475C1.67921 11.5789 1.88612 11.6326 2.09626 11.6307H11.6321C11.8413 11.6304 12.0467 11.5752 12.2277 11.4705C12.4087 11.3658 12.559 11.2153 12.6635 11.0341C12.768 10.853 12.8229 10.6475 12.8229 10.4384C12.8228 10.2292 12.7678 10.0238 12.6632 9.84269Z" stroke={stroke} strokeWidth="1.78797" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.86426 4.47656V6.86053" stroke={stroke} strokeWidth="1.78797" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.86426 9.24219H6.87092" stroke={stroke} strokeWidth="1.78797" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Icono de Condiciones médicas (estetoscopio)
export const ConditionsIcon = ({ 
  width = 15, 
  height = 16, 
  stroke = "#737373", 
  fill = "none",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 15 16" 
    fill={fill} 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path d="M6.55566 1.26562V2.53211" stroke={stroke} strokeWidth="1.78797" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.98047 1.26562V2.53211" stroke={stroke} strokeWidth="1.78797" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.98036 1.89844H2.38437C2.06823 1.89844 1.76505 2.03187 1.54151 2.26938C1.31797 2.50689 1.19238 2.82903 1.19238 3.16492V5.69788C1.19238 6.70556 1.56913 7.67196 2.23975 8.3845C2.91037 9.09703 3.81993 9.49733 4.76833 9.49733C5.71673 9.49733 6.62629 9.09703 7.29691 8.3845C7.96753 7.67196 8.34428 6.70556 8.34428 5.69788V3.16492C8.34428 2.82903 8.2187 2.50689 7.99516 2.26938C7.77162 2.03187 7.46843 1.89844 7.1523 1.89844H6.55631" stroke={stroke} strokeWidth="1.78797" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4.76758 9.50129C4.76758 10.509 5.14433 11.4754 5.81495 12.1879C6.48557 12.9004 7.39513 13.3007 8.34353 13.3007C9.29193 13.3007 10.2015 12.9004 10.8721 12.1879C11.5427 11.4754 11.9195 10.509 11.9195 9.50129V7.60156" stroke={stroke} strokeWidth="1.78797" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.9195 7.59937C12.5778 7.59937 13.1115 7.03235 13.1115 6.33289C13.1115 5.63343 12.5778 5.06641 11.9195 5.06641C11.2612 5.06641 10.7275 5.63343 10.7275 6.33289C10.7275 7.03235 11.2612 7.59937 11.9195 7.59937Z" stroke={stroke} strokeWidth="1.78797" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Icono de Flecha derecha (continuar)
export const ArrowRightIcon = ({ 
  width = 16, 
  height = 16, 
  fill = "white",
  className = "",
  ...props 
}) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path 
      d="M13.8538 8.35403L9.35375 12.854C9.25993 12.9478 9.13268 13.0006 9 13.0006C8.86732 13.0006 8.74007 12.9478 8.64625 12.854C8.55243 12.7602 8.49972 12.633 8.49972 12.5003C8.49972 12.3676 8.55243 12.2403 8.64625 12.1465L12.2931 8.50028H2.5C2.36739 8.50028 2.24021 8.4476 2.14645 8.35383C2.05268 8.26006 2 8.13289 2 8.00028C2 7.86767 2.05268 7.74049 2.14645 7.64672C2.24021 7.55296 2.36739 7.50028 2.5 7.50028H12.2931L8.64625 3.85403C8.55243 3.76021 8.49972 3.63296 8.49972 3.50028C8.49972 3.3676 8.55243 3.24035 8.64625 3.14653C8.74007 3.05271 8.86732 3 9 3C9.13268 3 9.25993 3.05271 9.35375 3.14653L13.8538 7.64653C13.9002 7.69296 13.9371 7.74811 13.9623 7.80881C13.9874 7.86951 14.0004 7.93457 14.0004 8.00028C14.0004 8.06599 13.9874 8.13105 13.9623 8.19175C13.9371 8.25245 13.9002 8.30759 13.8538 8.35403Z" 
      fill={fill}
    />
  </svg>
);

export default {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  MenuSidebarIcon,
  ClockIcon,
  PatientIcon,
  DoctorIcon,
  ConsultIcon,
  VideoCallIcon,
  MicrophoneIcon,
  BrainIcon,
  DocumentIcon,
  AllergyIcon,
  ConditionsIcon,
  ArrowRightIcon
};


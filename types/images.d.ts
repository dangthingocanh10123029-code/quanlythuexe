declare module '*.png' {
  import { ImageSourcePropType } from 'react-native';
  const content: ImageSourcePropType;
  export default content;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}
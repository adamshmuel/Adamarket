import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

const FSI = '⁨'; // First Strong Isolate
const PDI = '⁩'; // Pop Directional Isolate

const HEEBO_DEFAULT: TextStyle = {
  fontFamily: 'Heebo_400Regular',
  writingDirection: 'rtl',
};

export function BiDiText({ children, style, ...rest }: TextProps) {
  const content = typeof children === 'string' ? `${FSI}${children}${PDI}` : children;
  return (
    <Text {...rest} style={[HEEBO_DEFAULT, style] as StyleProp<TextStyle>}>
      {content}
    </Text>
  );
}

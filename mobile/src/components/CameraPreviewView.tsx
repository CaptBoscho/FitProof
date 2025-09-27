import React from 'react';
import { requireNativeComponent, ViewStyle } from 'react-native';

interface CameraPreviewViewProps {
  style?: ViewStyle;
}

const CameraPreviewViewNative = requireNativeComponent<CameraPreviewViewProps>('CameraPreviewView');

export const CameraPreviewView: React.FC<CameraPreviewViewProps> = ({ style }) => {
  return <CameraPreviewViewNative style={style} />;
};
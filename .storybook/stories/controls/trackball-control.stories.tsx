import * as THREE from 'three';
import { TrackballControl } from '../../../lib/controls/trackball-control';
import type { TrackballControlOptions } from '../../../lib/controls/trackball-control-options';
import {
  RotationControlStory,
  rotationControlArgTypes,
  rotationControlDefaultArgs,
} from '../../components/RotationControlStory';
import type { Meta, StoryObj } from '@storybook/react-vite';

const createTrackballControl = (camera: THREE.PerspectiveCamera) => {
  const options: TrackballControlOptions = {
    zoomOrDolly: {
      type: 'dolly',
      minDistance: 1,
      maxDistance: 100,
    },
  };

  return new TrackballControl(camera, options);
};

// Storybook metadata
const meta: Meta<typeof RotationControlStory> = {
  title: 'Controls/TrackballControl',
  component: RotationControlStory,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    createControl: createTrackballControl,
  },
  argTypes: rotationControlArgTypes,
};

export default meta;
type Story = StoryObj<typeof RotationControlStory>;

export const Default: Story = {
  args: rotationControlDefaultArgs,
};

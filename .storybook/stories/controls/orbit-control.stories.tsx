import * as THREE from 'three';
import type { OrbitControlOptions } from '../../../lib/controls/orbit-control';
import { OrbitControl } from '../../../lib/controls/orbit-control';
import {
  RotationControlStory,
  rotationControlArgTypes,
  rotationControlDefaultArgs,
} from '../../components/RotationControlStory';
import type { Meta, StoryObj } from '@storybook/react-vite';

const createOrbitControl = (camera: THREE.PerspectiveCamera) => {
  const options: OrbitControlOptions = {
    zoomOrDolly: {
      type: 'dolly',
      minDistance: 1,
      maxDistance: 100,
    },
  };

  return new OrbitControl(camera, options);
};

// Storybook metadata
const meta: Meta<typeof RotationControlStory> = {
  title: 'Controls/OrbitControl',
  component: RotationControlStory,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    createControl: createOrbitControl,
  },
  argTypes: rotationControlArgTypes,
};

export default meta;
type Story = StoryObj<typeof RotationControlStory>;

export const Default: Story = {
  args: rotationControlDefaultArgs,
};

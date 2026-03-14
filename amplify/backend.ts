import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource.ts';

defineBackend({ data });

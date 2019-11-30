import {Layer} from 'data/layer'
import {ActionRoot} from '../root'
import {patch501} from './501'
import {patch510} from './510'

export const layers: Array<Layer<ActionRoot>> = [
	// Layers should be in their own files, and imported for use here.
	// Example layer:
	// {patch: '5.05', data: {ATTACK: {id: 9001}}},
	patch501,
	patch510,
]

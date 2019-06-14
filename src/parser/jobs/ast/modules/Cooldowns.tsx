import ACTIONS from 'data/ACTIONS'
import CoreCooldowns from 'parser/core/modules/Cooldowns'

export default class Cooldowns extends CoreCooldowns {
	static cooldownOrder = [
		// oGCD ST heals
		ACTIONS.ESSENTIAL_DIGNITY.id,
		ACTIONS.CELESTIAL_INTERSECTION.id,
		// oGCD AoE heals
		ACTIONS.EARTHLY_STAR.id,
		ACTIONS.CELESTIAL_OPPOSITION.id,
		ACTIONS.HOROSCOPE.id,
		// Party mitigation
		ACTIONS.COLLECTIVE_UNCONSCIOUS.id,
		// Healing buffs
		ACTIONS.NEUTRAL_SECT.id,
	]
}

import ACTIONS from 'data/ACTIONS'
import Module from 'parser/core/Module'

const LILY_CONSUMERS = [ACTIONS.AFFLATUS_SOLACE.id, ACTIONS.AFFLATUS_RAPTURE.id]
// const BLLOD_LILY_GENERATORS = [ACTIONS.AFFLATUS_SOLACE.id, ACTIONS.AFFLATUS_RAPTURE.id]
const BLOOD_LILY_CONSUMERS = [ACTIONS.AFFLATUS_MISERY.id]

// const MAX_LILIES = 3
const MAX_BLOOD_LILIES = 3

export default class Gauge extends Module {
	static handle = 'gauge'

	lilies = 0
	blood_lilies = 0

	constructor(...args) {
		super(...args)
		this.addHook('cast', {by: 'player'}, this._onCast)

	}

	_onCast(event) {
		const abilityId = event.ability.guid
		if (BLOOD_LILY_CONSUMERS.includes(abilityId)) {
			this.parser.fabricateEvent({type: 'consumebloodlilies', abilityId: abilityId, consumed: this.blood_lilies})
			//currently, all blood lily consumers consume them all
			this.blood_lilies = 0
		}
		if (LILY_CONSUMERS.includes(abilityId)) {
			this.parser.fabricateEvent({type: 'consumelilies', abilityId: abilityId, consumed: 1})
			// All lily consumers only cost 1 lily
			this.lilies = Math.max(this.lilies - 1, 0)
			// Subsequently nourish the blood lily
			this.blood_lilies = Math.min(this.blood_lilies + 1, MAX_BLOOD_LILIES)
		}
	}
}

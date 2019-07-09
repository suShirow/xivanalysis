import {t} from '@lingui/macro'
import {Plural, Trans} from '@lingui/react'
import {ActionLink} from 'components/ui/DbLink'
import ACTIONS from 'data/ACTIONS'
import STATUSES from 'data/STATUSES'
import {CastEvent} from 'fflogs'
import Module, {dependency} from 'parser/core/Module'
import Suggestions, {SEVERITY, TieredSuggestion} from 'parser/core/modules/Suggestions'
import React from 'react'

// Things to track:
// Did they forget to activate horoscope?
// Did they cast a Helios/Aspected Helios without Horoscope despite having it up?
// Maybe track how they used it?

const SEVERETIES = {
	ACTIVATES_MISSED: {
		1: SEVERITY.MAJOR,
	},
	NO_HOROSCOPE_HELIOS: {
		1: SEVERITY.MAJOR,
	},
}

export default class Horoscope extends Module {
	static handle = 'earthlystar'
	static title = t('ast.horoscope.title')`Horoscope`

	@dependency private suggestions!: Suggestions

	_uses = 0

	protected init() {
		this.addHook('cast', {abilityId: ACTIONS.HOROSCOPE.id, by: 'player'}, this._onHoroscope)
		this.addHook('cast', {abilityId: ACTIONS.HOROSCOPE_ACTIVATION.id, by: 'player'}, this._onActivate)

		this.addHook('complete', this._onComplete)
	}

	_onHoroscope(event: CastEvent) {
		this._uses++
	}

	_onActivate(event: CastEvent) {
		const actionID = event.ability.guid

	}

	_onComplete() {

		/*
			SUGGESTION: Didn't activate
		*/
		this.suggestions.add(new TieredSuggestion({
			icon: ACTIONS.HOROSCOPE_ACTIVATION.icon,
			content: <Trans id="ast.horoscope.suggestion.expired.content">
				<ActionLink {...ACTIONS.HOROSCOPE} /> does not activate by itself, so don't forget to use it again or it will expire for no potency.
			</Trans>,
			why: <Trans id="ast.horoscope.suggestion.expired.why">
				<Plural value={1} one="# expiration" other="# expirations" />  of Horoscope without reading the fortunes again.
			</Trans>,
			tiers: SEVERETIES.ACTIVATES_MISSED,
			value: 1,
		}))

		/*
			SUGGESTION: Helios without Horoscope
		*/
		// this.suggestions.add(new TieredSuggestion({
		// 	icon: ACTIONS.HOROSCOPE.icon,
		// 	content: <Trans id="ast.horoscope.suggestion.no-horoscope-helios.content">
		// 		Use <ActionLink {...ACTIONS.HOROSCOPE} /> more frequently. It may save a healing GCD and results in more damage output.
		// 	</Trans>,
		// 	tiers: SEVERETIES.USES_MISSED,
		// 	value: 1,
		// 	why: <Trans id="ast.horoscope.suggestion.no-horoscope-helios.why">
		// 		{1} Helios or Aspected Helios was cast without Horoscope despite {this.parser.formatDuration(holdDuration)}.
		// 	</Trans>,
		// }))
	}

}

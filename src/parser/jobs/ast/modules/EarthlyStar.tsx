import {t} from '@lingui/macro'
import {Plural, Trans} from '@lingui/react'
import {ActionLink} from 'components/ui/DbLink'
import {Data} from 'parser/core/modules/Data'
import {CastEvent, BuffEvent} from 'fflogs'
import Module, {dependency} from 'parser/core/Module'
import Suggestions, {SEVERITY, TieredSuggestion} from 'parser/core/modules/Suggestions'
import React from 'react'
import PrecastStatus from 'parser/core/modules/PrecastStatus'
import {Statistics, SimpleStatistic} from 'parser/core/modules/Statistics'

// Tiny module to count the number of early detonations on Earthly Star.
// TODO: Could expand to analyse Earthly Star usage, timing, overheal, etc - Sushi

const SEVERETIES = {
	UNCOOKED: {
		1: SEVERITY.MEDIUM,
		2: SEVERITY.MAJOR,
	},
	USES_MISSED: {
		1: SEVERITY.MEDIUM,
		2: SEVERITY.MAJOR,
	},
}

// const PLAYER_CASTS = [ACTIONS.EARTHLY_STAR.id, ACTIONS.STELLAR_DETONATION.id]
// const PLAYER_STATUSES = [STATUSES.EARTHLY_DOMINANCE.id, STATUSES.GIANT_DOMINANCE.id]

export default class EarthlyStar extends Module {
	static handle = 'earthlystar'
	static title = t('ast.earthly-star.title')`Earthly Star`

	@dependency private suggestions!: Suggestions
	@dependency private precastStatus!: PrecastStatus
	@dependency private statistics!: Statistics
	@dependency private data!: Data

	private uses = 0
	private lastUse = 0
	private totalHeld = 0
	private earlyBurstCount = 0
	private trackPrepullPlace = false
	private firstCookedTimestamp = 0
	private firstPlace = 0
	private isFirstPlaceEstimated: boolean = false

	private PET_CASTS: number[] = [this.data.actions.STELLAR_BURST.id, this.data.actions.STELLAR_EXPLOSION.id]

	_uses = 0
	_lastUse = 0
	_totalHeld = 0
	_earlyBurstCount = 0

	protected init() {
		this.addEventHook('cast', {abilityId: this.data.actions.EARTHLY_STAR.id, by: 'player'}, this.onPlace)
		this.addEventHook('cast', {abilityId: this.PET_CASTS, by: 'pet'}, this.onPetCast)
		this.addHook('applybuff', {abilityId: this.data.statuses.GIANT_DOMINANCE.id, by: 'player'}, this.onCooked)

		this.addEventHook('complete', this.onComplete)
	}

	private onPlace(event: CastEvent) {

		// this was prepull
		if (event.timestamp < this.parser.fight.start_time) {
			this.trackPrepullPlace = true
			return
		}

		// Initialize last use
		if (this.lastUse === 0) {
			this.firstPlace = event.timestamp
			this.lastUse = this.parser.fight.start_time
		}

		const _held = event.timestamp - this._lastUse - (this.data.actions.EARTHLY_STAR.cooldown * 1000)
		if (_held > 0) {
			this._totalHeld += _held
		}
		// update the last use
		this._lastUse = event.timestamp
	}

	onPetCast(event: CastEvent) {
		const actionID = event.ability.guid

		if (actionID === this.data.actions.STELLAR_BURST.id) {
			this._earlyBurstCount++
		}

		// Everything from here is to track prepull place
		if (!this.trackPrepullPlace) {
			return
		}
		let preplaceTime: number
		if (this.firstCookedTimestamp > 0) {
			// It was cooked, so first see if they popped it early
			if (event.timestamp < this.firstCookedTimestamp + (this.data.statuses.GIANT_DOMINANCE.duration * 1000)) {
				// popped early, so total time in oven is (now - firstCookedTimestamp) - earthly dom duration
				preplaceTime = event.timestamp - (event.timestamp - this.firstCookedTimestamp) - (this.data.statuses.EARTHLY_DOMINANCE.duration * 1000)
			} else {
				// it wasn't popped early so just count from 20s from now backward to see when they placed it
				preplaceTime = event.timestamp - (this.data.statuses.GIANT_DOMINANCE.duration * 1000) - (this.data.statuses.EARTHLY_DOMINANCE.duration * 1000)
			}
		} else {
			// Still rare and they manually popped it, so we know it's at most 10s ago but we don't know exactly.
			// Just assume max duration of smol Dominance.
			preplaceTime = event.timestamp - (this.data.statuses.EARTHLY_DOMINANCE.duration * 1000)
			this.isFirstPlaceEstimated = true
		}
		this.firstPlace = preplaceTime
		this.lastUse = preplaceTime
		this.trackPrepullPlace = false
	}

	private onCooked(event: BuffEvent) {
		if (!this.trackPrepullPlace) {
			return
		}
		this.firstCookedTimestamp = event.timestamp
	}

	onComplete() {

		/*
			SUGGESTION: Early detonations
		*/
		const earlyBurstCount = this._earlyBurstCount
		if (earlyBurstCount > 0) {
			this.suggestions.add(new TieredSuggestion({
				icon: this.data.actions.STELLAR_DETONATION.icon,
				content: <Trans id="ast.earthly-star.suggestion.uncooked.content">
					Plan your <ActionLink {...this.data.actions.EARTHLY_STAR} /> placements so that it's always cooked enough for the full potency when you need it.
				</Trans>,
				why: <Trans id="ast.earthly-star.suggestion.uncooked.why">
					<Plural value={earlyBurstCount} one="# detonation" other="# detonations" /> of an uncooked Earthly Star.
				</Trans>,
				tiers: SEVERETIES.UNCOOKED,
				value: earlyBurstCount,
			}))
		}

		/*
			SUGGESTION: Missed uses
		*/
		const holdDuration = this.uses === 0 ? this.parser.currentDuration : this.totalHeld
		const usesMissed = Math.floor(holdDuration / (this.data.actions.EARTHLY_STAR.cooldown * 1000))
		this.suggestions.add(new TieredSuggestion({
			icon: this.data.actions.EARTHLY_STAR.icon,
			content: <Trans id="ast.earthly-star.suggestion.missed-use.content">
				Use <ActionLink {...this.data.actions.EARTHLY_STAR} /> more frequently. It may save a healing GCD and results in more damage output.
			</Trans>,
			tiers: SEVERETIES.USES_MISSED,
			value: usesMissed,
			why: <Trans id="ast.earthly-star.suggestion.missed-use.why">
				About {usesMissed} uses of Earthly Star were missed by holding it for at least a total of {this.parser.formatDuration(holdDuration)}.
			</Trans>,
		}))

		// Statistic box
		this.statistics.add(new SimpleStatistic({
			title: <Trans id="ast.earthly-star.statistic.title">First Earthly Star</Trans>,
			icon: this.data.actions.EARTHLY_STAR.icon,
			value: <>{this.parser.formatTimestamp(this.firstPlace)}
				{this.isFirstPlaceEstimated && <Trans id="ast.earthly-star.statistic.estimated">(est.)</Trans>}
			</>,
			info: (
				<Trans id="ast.earthly-star.statistic.info">
					Generally, it is optimal to place prepull to get more offensive uses, but this depends on how the encounter's raidwide damage
					timing and healing needs.
				</Trans>
			),
		}))

	}

}

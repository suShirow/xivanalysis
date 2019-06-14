import {t} from '@lingui/macro'
import {Plural, Trans} from '@lingui/react'
import {ActionLink} from 'components/ui/DbLink'
import {getDataBy} from 'data'
import ACTIONS from 'data/ACTIONS'
import STATUSES from 'data/STATUSES'
import Module, {dependency} from 'parser/core/Module'
import Checklist, {Requirement, TARGET, TieredRule} from 'parser/core/modules/Checklist'
import Suggestions, {SEVERITY, TieredSuggestion} from 'parser/core/modules/Suggestions'
import React from 'react'
// import {DRAWN_ARCANA_USE} from './ArcanaGroups'
import DISPLAY_ORDER from './DISPLAY_ORDER'
import Cooldowns from 'parser/jobs/mch/modules/Cooldowns';
import CooldownDowntime from 'parser/core/modules/CooldownDowntime';

// THINGS TO TRACK:
// Whether they used draw prepull (check how soon they played and then drew again)
// perhaps go for displaying 11 out of 10 plays used, since prepull draw can be iffy?

const CARD_DURATION = 1500
const TIME_TO_PLAY_THRICE = 7500
// const POST_SLEVE_EXCUSED_DRAW_DRIFT = 5000

export default class Draw extends Module {
	static handle = 'draw'
	static title = t('ast.draw.title')`Draw`
	// static displayOrder = DISPLAY_ORDER.DRAW

	@dependency private cooldowns!: Cooldowns
	@dependency private cooldownDownTime!: CooldownDowntime
	@dependency private checklist!: Checklist
	@dependency private suggestions!: Suggestions

	_lastDrawTimestamp = 0
	_draws = 0
	_drawDrift = 0
	_drawTotalDrift = 0
	_sleeveStacks: 0 | 1 | 2 = 0

	_plays = 0

	protected init() {
		const drawFilter = {by: 'player', abilityId: ACTIONS.DRAW.id}
		const sleeveFilter = {by: 'player', abilityId: ACTIONS.SLEEVE_DRAW.id}
		const playFilter = {by: 'player', abilityId: ACTIONS.PLAY.id}

		this.addHook('cast', drawFilter, this._onDraw)
		this.addHook('cast', sleeveFilter, this._onSleeveDraw)
		this.addHook('cast', playFilter, this._onPlay)

		// this.addHook('applybuff', lsBuffFilter, this._onApplyLightspeed)
		// this.addHook('removebuff', lsBuffFilter, this._onRemoveLightspeed)
		this.addHook('complete', this._onComplete)
	}

	private _onDraw(event) {
		this._draws++

		if (this._draws === 1) {
			// The first use, take holding as from the first minute of the fight
			this._drawDrift = event.timestamp - this.parser.fight.start_time

		} else if (this._sleeveStacks > 0) {
			this._sleeveStacks--
			this.cooldowns.resetCooldown(ACTIONS.DRAW.id)

			// Take holding as the time from last draw
			this._drawDrift = event.timestamp - this._lastDrawTimestamp
		} else {
			// Take holding as from the time it comes off cooldown
			this._drawDrift = event.timestamp - this._lastDrawTimestamp - (ACTIONS.DRAW.cooldown * 1000)
		}

		// Keep track of total drift time not using Draw
		if (this._drawDrift > 0) {
			this._drawTotalDrift += this._drawDrift
		}

		// update the last use
		this._lastDrawTimestamp = event.timestamp
	}

	private _onPlay() {
		this._plays++
	}

	private _onSleeveDraw() {
		this.cooldowns.resetCooldown(ACTIONS.DRAW.id)
		this._sleeveStacks = 2
	}

	private _onComplete() {

		// Max plays:
		// [(fight time / 30s draw time) - 1 if fight time doesn't end between xx:05-xx:29s, and xx:45-xx:60s]
		// eg 7:00: 14 -1 = 13  draws by default. 7:17 fight time would mean 14 draws, since they can play the last card at least.
		// in otherwords, fightDuration - 15s (for the buff @ CARD_DURATION)
		// SleeveDraw consideration:
		// fight time / 180s sleeve time: each sleeve gives an extra 3 plays (unless they clip Draw CD) 7:00 = 6 extra plays.
		// consider time taken to actually play 3 times would be about 3 GCds (7s?) and consider 15s for the buff @ CARD_DURATION
		// Prepull consideration: + 1 play

		// Begin Theoretical Max Plays calc
		const fightDuration = this.parser.fight.end_time - this.parser.fight.start_time
		const playsFromSleeveDraw = Math.floor((fightDuration - CARD_DURATION - TIME_TO_PLAY_THRICE) / (ACTIONS.SLEEVE_DRAW.cooldown * 1000))
		const theoreticalMaxPlays = Math.floor((fightDuration - CARD_DURATION) / (ACTIONS.DRAW.cooldown * 1000)) + playsFromSleeveDraw + 1
		// TODO: Include downtime calculation for each fight??

		// Number of cards played
		this.checklist.add(new TieredRule({
			name: <Trans id="ast.draw.checklist.name">
				Play as many cards as possible
			</Trans>,
			description: <Trans id="ast.draw.checklist.description">
				Playing cards will let you collect seals for <ActionLink {...ACTIONS.DIVINATION} /> and raise the party damage. <br/>
				* The theoretical maximum here accounts for <ActionLink {...ACTIONS.SLEEVE_DRAW} /> and assumes a draw was made pre-pull.
			</Trans>,
			tiers: {[theoreticalMaxPlays - 1]: TARGET.WARN, [theoreticalMaxPlays - 2]: TARGET.FAIL, [theoreticalMaxPlays]: TARGET.SUCCESS},
			requirements: [
				new Requirement({
					name: <Trans id="ast.draw.checklist.requirement.name">
						<ActionLink {...ACTIONS.PLAY} /> uses
					</Trans>,
					value: this._plays,
					target: theoreticalMaxPlays,
				}),
			],
		}))

		// Didn't keep draw on cooldown
		this.suggestions.add(new TieredSuggestion({
			icon: ACTIONS.DRAW.icon,
			content: <Trans id="ast.draw.suggestions.cards.content">
				Keep Draw on cooldown
			</Trans>,
			why: <Trans id="ast.draw.suggestions.cards.why">
				<Plural value={drawUsesMissedFromCardsRounded} one="# Draw" other="# Draws" />
					lost.
			</Trans>,
			tiers: CARD_LOSS_SEVERITY,
			value: drawUsesMissedFromCardsRounded,
		}))

		// const drawUsesMissedFromSleeve = ((sleeveHoldDuration - this._excusedDrawTimeLossFromSleeve) / (ACTIONS.DRAW.cooldown * 1000))
		// const drawUsesMissedFromSleeveRounded = Math.floor(drawUsesMissedFromSleeve)

		// Sleevedraw overwrote draw or not right after draw.
		this.suggestions.add(new TieredSuggestion({
			icon: ACTIONS.SLEEVE_DRAW.icon,
			content: <Trans id="ast.sleeve-draw.suggestions.draw.content">
					<ActionLink {...ACTIONS.SLEEVE_DRAW} /> restarts the cooldown on <ActionLink {...ACTIONS.DRAW} />,
					so it is better to use it right after a Draw.
			</Trans>,
			why: <Trans id="ast.sleeve-draw.suggestions.draw.why">
				<Plural value={drawUsesMissedFromSleeveRounded} one="# Draw" other="# Draws" />
					lost by having their cooldowns reset by Sleeve Draw.
			</Trans>,
			tiers: CARD_LOSS_SEVERITY,
			value: drawUsesMissedFromSleeveRounded,
		}))

		// Didn't use sleeve draw
		this.suggestions.add(new TieredSuggestion({
			icon: ACTIONS.SLEEVE_DRAW.icon,
			content: <Trans id="ast.sleeve-draw.suggestions.draw.content">
					You didn't use <ActionLink {...ACTIONS.SLEEVE_DRAW} /> at all. It should be used right after <ActionLink {...ACTIONS.DRAW} /> to reset the cooldown.
			</Trans>,
			why: <Trans id="ast.sleeve-draw.suggestions.draw.why">
				No sleeve draws used.
			</Trans>,
			tiers: SEVERITY.MAJOR,
			value: 0,
		}))

	}
}

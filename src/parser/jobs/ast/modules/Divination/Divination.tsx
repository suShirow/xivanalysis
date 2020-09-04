import {t} from '@lingui/macro'
import {Plural, Trans} from '@lingui/react'
import _ from 'lodash'
import React, {Fragment} from 'react'
import {Icon, Message} from 'semantic-ui-react'

import {ActionLink, StatusLink} from 'components/ui/DbLink'
import {RotationTable} from 'components/ui/RotationTable'
import {Data} from 'parser/core/modules/Data'
import {BuffEvent, CastEvent} from 'fflogs'
import Module, {dependency} from 'parser/core/Module'
import Combatants from 'parser/core/modules/Combatants'
import {NormalisedApplyBuffEvent} from 'parser/core/modules/NormalisedEvents'
import Suggestions, {SEVERITY, TieredSuggestion} from 'parser/core/modules/Suggestions'
import {ArcanaTracking} from '../ArcanaTracking'

import {Timeline} from 'parser/core/modules/Timeline'
import DISPLAY_ORDER from '../DISPLAY_ORDER'

const SEVERITY_TIERS = {
	1: SEVERITY.MINOR,
	2: SEVERITY.MEDIUM,
	3: SEVERITY.MAJOR,
}

interface DivinationTarget {
	id: number,
	name?: string,
	job?: string,
}

class DivinationWindow {
	start: number
	end?: number

	rotation: Array<NormalisedApplyBuffEvent | CastEvent> = []
	gcdCount: number = 0
	trailingGcdEvent?: CastEvent

	hasArcana: boolean = false
	playersBuffed: DivinationTarget[] = []

	containsOtherAST: boolean = false

	constructor(start: number) {
		this.start = start
	}
}

export default class Divination extends Module {
	static handle = 'divination'
	static title = t('ast.divination.title')`Divination`
	static displayOrder = DISPLAY_ORDER.DIVINATION

	@dependency private combatants!: Combatants
	@dependency private data!: Data
	@dependency private suggestions!: Suggestions
	@dependency private timeline!: Timeline
	@dependency private arcanaTracking!: ArcanaTracking

	private history: DivinationWindow[] = []
	private lastDevilmentTimestamp: number = -1

	protected init() {
		this.addEventHook('normalisedapplybuff', {to: 'player', abilityId: this.data.statuses.DIVINATION.id}, this.tryOpenWindow)
		this.addEventHook('normalisedapplybuff', {by: 'player', abilityId: this.data.statuses.DIVINATION.id}, this.countTechBuffs)
		this.addEventHook('cast', {by: 'player'}, this.onCast)
		this.addEventHook('complete', this.onComplete)
	}

	private countTechBuffs(event: NormalisedApplyBuffEvent) {
		// Get this from tryOpenWindow. If a window wasn't open, we'll open one.
		// If it was already open (because another Dancer went first), we'll keep using it
		const lastWindow: DivinationWindow | undefined = this.tryOpenWindow(event)

		// Find out how many players we hit with the buff.
		if (!lastWindow.playersBuffed) {
			// event.confirmedEvents.filter(hit => this.parser.fightFriendlies.findIndex(f => f.id === hit.targetID) >= 0)
			// lastWindow.playersBuffed
		}
	}

	private tryOpenWindow(event: NormalisedApplyBuffEvent): DivinationWindow {
		const lastWindow: DivinationWindow | undefined = _.last(this.history)

		// Handle multiple astrologian's buffs overwriting each other, we'll have a remove then an apply with the same timestamp
		// If that happens, re-open the last window and keep tracking
		if (lastWindow) {
			if (event.sourceID && event.sourceID !== this.parser.player.id) {
				lastWindow.containsOtherAST = true
			}
			if (!lastWindow.end) {
				return lastWindow
			}
			if (lastWindow.end === event.timestamp) {
				lastWindow.end = undefined
				return lastWindow
			}
		}

		const newWindow = new DivinationWindow(event.timestamp)
		this.history.push(newWindow)
		return newWindow
	}


	// Make sure all applicable statuses have fallen off before the window closes
	private isWindowOkToClose(window: DivinationWindow): boolean {
		// if (window.hasArcana && !window.buffsRemoved.includes(STATUSES.DEVILMENT.id)) {
		// 	return false
		// }
		// if (!window.buffsRemoved.includes(STATUSES.DIVINATION.id)) {
		// 	return false
		// }
		return true
	}

	private onCast(event: CastEvent) {
		// const lastWindow: DivinationWindow | undefined = _.last(this.history)

		// if (event.ability.guid === this.data.actions.DEVILMENT.id) {
		// 	this.handleDevilment(lastWindow)
		// }

		// // If we don't have a window, bail
		// if (!lastWindow) {
		// 	return
		// }

		// const action = getDataBy(ACTIONS, 'id', event.ability.guid) as TODO

		// // Can't do anything else if we didn't get a valid action object
		// if (!action) {
		// 	return
		// }

		// // If this window isn't done yet add the action to the list
		// // if (!lastWindow.end) {
		// // 	lastWindow.rotation.push(event)
		// // 	// Check whether this window has a devilment status from before the window began
		// // 	if (!lastWindow.hasDevilment && this.combatants.selected.hasStatus(STATUSES.DEVILMENT.id)) {
		// // 		lastWindow.hasDevilment = true
		// // 	}
		// // 	if (action.onGcd) {
		// // 		lastWindow.gcdCount++
		// // 	}
		// // 	if (DIVINATIONES.includes(event.ability.guid) || lastWindow.playersBuffed < 1) {
		// // 		lastWindow.containsOtherAST = true
		// // 	}
		// // 	return
		// // }

		// // If we haven't recorded a trailing GCD event for this closed window, do so now
		// if (lastWindow.end && !lastWindow.trailingGcdEvent && action.onGcd) {
		// 	lastWindow.trailingGcdEvent = event
		// }
	}

	private handleDevilment(lastWindow: DivinationWindow | undefined) {
		// // Don't ding if this is the first Devilment, depending on which job the Dancer is partnered with, it may
		// // be appropriate to use Devilment early. In all other cases, Devilment should be used during Technical Finish
		// if (!this.combatants.selected.hasStatus(STATUSES.DIVINATION.id) && (this.lastDevilmentTimestamp < 0 ||
		// 	// If the first use we detect is after the cooldown, assume they popped it pre-pull and this 'first'
		// 	// Use is actually also bad
		// 	this.parser.currentTimestamp >= DEVILMENT_COOLDOWN_MILLIS)) {
		// 	this.badDevilments++
		// }

		// this.lastDevilmentTimestamp = this.parser.currentTimestamp

		// // If we don't have a window for some reason, bail
		// if (!lastWindow || lastWindow.end) {
		// 	return
		// }

		// lastWindow.usedDevilment = true

		// // Note if the Devilment was used after the second GCD
		// if (lastWindow.gcdCount <= 1) {
		// 	lastWindow.timelyDevilment = true
		// }
	}

	private onComplete() {
		/*
			SUGGESTION: Pair Divinations with at least one Arcana
		*/
		// this.suggestions.add(new TieredSuggestion({
		// 	icon: this.data.actions.DIVINATION.icon,
		// 	content: <Trans id="ast.divination.suggestions.bad-devilments.content">
		// 		Using <ActionLink {...this.data.actions.DIVINATION} /> outside of your <StatusLink {...this.data.statuses.DIVINATION} /> windows leads to an avoidable loss in DPS. Aside from certain opener situations, you should be using <ActionLink {...ACTIONS.DEVILMENT} /> at the beginning of your <StatusLink {...STATUSES.DIVINATION} /> windows.
		// 	</Trans>,
		// 	tiers: SEVERITY_TIERS,
		// 	value: this.hasArcana,
		// 	why: <Trans id="ast.divination.suggestions.bad-devilments.why">
		// 		<Plural value={this.badDevilments} one="# Devilment" other="# Devilments" /> used outside <StatusLink {...this.data.statuses.DIVINATION} />.
		// 	</Trans>,
		// }))


	}

	output() {
		const otherAstros = this.history.filter(window => window.containsOtherAST).length > 0
		return <Fragment>
			{otherAstros && (
				<Message>
					<Trans id="ast.divination.rotation-table.message">
						This log contains <ActionLink showIcon={false} {...this.data.actions.DIVINATION} /> windows that were started or extended by other Dancers.<br />
						Use your best judgement about which windows you should be dumping <ActionLink showIcon={false} {...this.data.actions.DEVILMENT} />, Feathers, and Esprit under.<br />
						Try to make sure they line up with other raid buffs to maximize damage.
					</Trans>
				</Message>
			)}
			<RotationTable
				notes={[
					{
						header: <Trans id="ast.divination.rotation-table.header.missed"><ActionLink showName={false} {...this.data.actions.DEVILMENT} /> On Time?</Trans>,
						accessor: 'timely',
					},
					{
						header: <Trans id="ast.divination.rotation-table.header.pooled"><ActionLink showName={false} {...this.data.actions.FAN_DANCE} /> Pooled?</Trans>,
						accessor: 'pooled',
					},
					{
						header: <Trans id="ast.divination.rotation-table.header.buffed">Players Buffed</Trans>,
						accessor: 'buffed',
					},
				]}
				data={this.history.map(window => {
					return ({
						start: window.start - this.parser.fight.start_time,
						end: window.end != null ?
							window.end - this.parser.fight.start_time :
							window.start - this.parser.fight.start_time,
						notesMap: {
							// timely: <>{this.getNotesIcon(!window.timelyDevilment)}</>,
							// arcana: <>{this.getNotesIcon(window.poolingProblem)}</>,
							buffed: <>{window.playersBuffed ? window.playersBuffed : 'N/A'}</>,
						},
						rotation: [],
					})
				})}
				onGoto={this.timeline.show}
			/>
		</Fragment>
	}
	private getNotesIcon(ruleFailed: boolean) {
		return <Icon
			name={ruleFailed ? 'remove' : 'checkmark'}
			className={ruleFailed ? 'text-error' : 'text-success'}
		/>
	}
}

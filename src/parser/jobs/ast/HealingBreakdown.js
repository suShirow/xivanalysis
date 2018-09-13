/* eslint-disable */
import {Trans, i18nMark} from '@lingui/react'
import React from 'react'
import {Pie as PieChart} from 'react-chartjs-2'

import {ActionLink, StatusLink} from 'components/ui/DbLink'
import ACTIONS, {getAction} from 'data/ACTIONS'
import JOBS, {ROLES} from 'data/JOBS'
import PETS from 'data/PETS'
import STATUSES from 'data/STATUSES'
import Module from 'parser/core/Module'
import {Suggestion, TieredSuggestion, SEVERITY} from 'parser/core/modules/Suggestions'

import DISPLAY_ORDER from './DISPLAY_ORDER'
import styles from './HealingBreakdown.module.css'

const NO_PET_ID = -1

const GCD_HEALS = [
	ACTIONS.BENEFIC.id,
	ACTIONS.BENEFIC_II.id,
	ACTIONS.HELIOS.id,
	ACTIONS.ASPECTED_HELIOS.id,
	ACTIONS.ASPECTED_BENEFIC.id,
	ACTIONS.ASCEND.id,
]

const OGCD_HEALS = [
	ACTIONS.ESSENTIAL_DIGNITY.id,
	ACTIONS.LADY_OF_CROWNS.id,
	ACTIONS.EATHLY_STAR.id,
	ACTIONS.ASPECTED_BENEFIC.id,
]

const GCD_DAMAGE = [
	ACTIONS.MALEFIC_III.id,
	ACTIONS.COMBUST_II.id,
	ACTIONS.GRAVITY.id,
]

const CHART_COLOURS = {
	[NO_PET_ID]: '#888',
	[PETS.GARUDA_EGI.id]: '#9c0',
	[PETS.TITAN_EGI.id]: '#ffbf23',
	[PETS.IFRIT_EGI.id]: '#d60808',
	[PETS.DEMI_BAHAMUT.id]: '#218cd6',
}

const TITAN_WARN_PERCENT = 5

// Durations should probably be ACTIONS data
export const SUMMON_BAHAMUT_LENGTH = 20000

// noPetUptime severity, in %
const NO_PET_SEVERITY = {
	1: SEVERITY.MEDIUM,
	5: SEVERITY.MAJOR,
}

export default class HealingBreakdown extends Module {
	static handle = 'pets'
	static i18n_id = i18nMark('smn.pets.title')
	static dependencies = [
		'precast',
		'suggestions',
	]
	static displayOrder = DISPLAY_ORDER.HEALING_BREAKDOWN

	_gcdHistory = []
	_healingHistory = []


	_lastSummonBahamut = -1

	_petUptime = new Map()

	constructor(...args) {
		super(...args)
		this.addHook('init', this._onInit)
		this.addHook('cast', {by: 'player'}, this._onCast)
		this.addHook('complete', this._onComplete)
	}

	_onCast(event) {
		const actionId = event.abilty.guid

		let historyItem = {
			event: event,

		}

		if(getAction(actionId).onGcd) {
			this._gcdHIstory.push(event)
		}

		if(GCD_HEALS.includes(actionId)){
			//
		}

	}
	_onComplete(event) {
		// Finalise the history
		const id = this._currentPet.id
		const start = this._currentPet.timestamp
		const end = event.timestamp

		this._history.push({id, start, end})
		const value = (this._petUptime.get(id) || 0) + end - start
		this._petUptime.set(id, value)

	}

	output() {
		const uptimeKeys = Array.from(this._petUptime.keys())

		const data = {
			labels: uptimeKeys.map(petId => this.getPetName(petId)),
			datasets: [{
				data: Array.from(this._petUptime.values()),
				backgroundColor: uptimeKeys.map(petId => CHART_COLOURS[petId]),
			}],
		}

		const options = {
			responsive: false,
			legend: {display: false},
			tooltips: {enabled: false},
		}

		return <>
			<div className={styles.chartWrapper}>
				<PieChart
					data={data}
					options={options}
					width={100}
					height={100}
				/>
			</div>
			<table className={styles.table}>
				<thead>
					<tr>
						<th></th>
						<th>Pet</th>
						<th>Uptime</th>
						<th>%</th>
					</tr>
				</thead>
				<tbody>
					{uptimeKeys.map(petId => <tr key={petId}>
						<td><span
							className={styles.swatch}
							style={{backgroundColor: CHART_COLOURS[petId]}}
						/></td>
						<td>{this.getPetName(petId)}</td>
						<td>{this.parser.formatDuration(this._petUptime.get(petId))}</td>
						<td>{this.getPetUptimePercent(petId)}%</td>
					</tr>)}
				</tbody>
			</table>
		</>
	}
}

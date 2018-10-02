/* eslint-disable */
import {Trans, i18nMark} from '@lingui/react'
import React from 'react'
import {Grid} from 'semantic-ui-react'
import {Pie as PieChart} from 'react-chartjs-2'

import {ActionLink, StatusLink} from 'components/ui/DbLink'
import ACTIONS, {getAction} from 'data/ACTIONS'
import JOBS, {ROLES} from 'data/JOBS'
import STATUSES from 'data/STATUSES'
import Module from 'parser/core/Module'
// import {Suggestion, TieredSuggestion, SEVERITY} from 'parser/core/modules/Suggestions'

/* 
- Healing pie charts of healing by source (ogcd/gcd/hot/shields), 
and a pie chart of gcd usage, with a focus on healing 
(damage is all under 1 category, while healing split up on a per skill basis)

*/

// import DISPLAY_ORDER from './DISPLAY_ORDER'
import styles from './HealingBreakdown.module.css'

const NO_ACTION_ID = -1

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
	ACTIONS.EARTHLY_STAR.id,
	ACTIONS.ASPECTED_BENEFIC.id,
]

const GCD_DAMAGE = [
	ACTIONS.MALEFIC_III.id,
	ACTIONS.COMBUST_II.id,
	ACTIONS.GRAVITY.id,
]

const CHART_COLOURS = {
	[NO_ACTION_ID]: '#888',
	[ACTIONS.BENEFIC.id]: '#9c0',
	[ACTIONS.BENEFIC_II.id]: '#9c0',
	[ACTIONS.HELIOS.id]: '#218cd6',
	[ACTIONS.ASPECTED_HELIOS.id]: '#218cd6',
	[ACTIONS.ASPECTED_BENEFIC.id]: '#9c0',
	[ACTIONS.MALEFIC_III.id]: '#d60808',
	[ACTIONS.COMBUST_II.id]: '#d60808',
	[ACTIONS.GRAVITY.id]: '#d60808',
}

export default class HealingBreakdown extends Module {
	static handle = 'healingbreakdown'
	static title = 'Healing Breakdown'
	static i18n_id = i18nMark('ast.healingbreakdown.title')
	static dependencies = [
		'suggestions',
	]
	static displayOrder = 49

	_gcdHistory = new Map()
	_healHistory = []

	constructor(...args) {
		super(...args)
		this.addHook('cast', {by: 'player'}, this._onCast)
		this.addHook('heal', {by: 'player'}, this._onHeal)
		this.addHook('complete', this._onComplete)
	}

	_onCast(event) {
		const actionId = event.ability.guid

		if(getAction(actionId).onGcd) {
			this._logGcdEvent(event)
		}

	}

	_onHeal(event) {
		console.log(event)
		const actionId = event.ability.guid

		// ogcd gcd hot shield, other mitigation, target based.

		if(event.tick) {
			
		}

		if(GCD_HEALS.includes(actionId)){
			!this._healHistory.has(actionId) && this._healHistory.set(actionId, 0)

			const count = this._healHistory.get(actionId)
			this._healHistory.set(actionId, count + 1)
		}
	}

	// makes a Map of actionIds:uses
	_logGcdEvent(event) {
		const actionId = event.ability.guid

		!this._gcdHistory.has(actionId) && this._gcdHistory.set(actionId, 0)

		const count = this._gcdHistory.get(actionId)
		this._gcdHistory.set(actionId, count + 1)

	}

	_onComplete(event) {
		// Finalise the history
	}

	output() {
		const gcdKeys = Array.from(this._gcdHistory.keys())

		const gcdData = {
			labels: gcdKeys.map(actionId => getAction(actionId).name),
			datasets: [{
				data: Array.from(this._gcdHistory.values()),
				backgroundColor: gcdKeys.map(actionId => CHART_COLOURS[actionId]),
			}],
		}



		const healKeys = Array.from(this._healHistory.keys())

		const healData = {
			labels: healKeys.map(actionId => getAction(actionId).name),
			datasets: [{
				data: Array.from(this._healHistory.values()),
				backgroundColor: healKeys.map(actionId => CHART_COLOURS[actionId]),
			}],
		}

		const options = {
			responsive: false,
			legend: {display: false},
			tooltips: {enabled: false},
		}

		return <Grid columns='two'>
			<Grid.Column>
				<div>GCD Breakdown</div>
				<div>
					<div className={styles.chartWrapper}>
						<PieChart
							data={gcdData}
							options={options}
							width={100}
							height={100}
						/>
					</div>
					<table className={styles.table}>
						<thead>
							<tr>
								<th></th>
								<th>Action</th>
								<th>Uses</th>
								<th>%</th>
							</tr>
						</thead>
						<tbody>
							{gcdKeys.map(actionId => <tr key={actionId}>
								<td><span
									className={styles.swatch}
									style={{backgroundColor: CHART_COLOURS[actionId]}}
								/></td>
								<td>{getAction(actionId).name}</td>
								<td>{this._gcdHistory.get(actionId)}</td>
								<td></td>
							</tr>)}
						</tbody>
					</table>
				</div>
			</Grid.Column>
			<Grid.Column>
				<div>Healing Breakdown</div>
				<div>
					<div className={styles.chartWrapper}>
						<PieChart
							data={healData}
							options={options}
							width={100}
							height={100}
						/>
					</div>
					<table className={styles.table}>
						<thead>
							<tr>
								<th></th>
								<th>Action</th>
								<th>Uses</th>
								<th>%</th>
							</tr>
						</thead>
						<tbody>
							{healKeys.map(actionId => <tr key={actionId}>
								<td><span
									className={styles.swatch}
									style={{backgroundColor: CHART_COLOURS[actionId]}}
								/></td>
								<td>{getAction(actionId).name}</td>
								<td>{this._healHistory.get(actionId)}</td>
								<td></td>
							</tr>)}
						</tbody>
					</table>
				</div>
			</Grid.Column>
			
		</Grid>
	}
}

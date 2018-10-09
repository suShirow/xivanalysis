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

const HOT_HEALS = [
	STATUSES.ASPECTED_HELIOS.id, 
	STATUSES.WHEEL_OF_FORTUNE.id, 
	STATUSES.ASPECTED_BENEFIC.id
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

const HEAL_TYPE_COLORS = {
	['ogcd']: '#9c0',
	['hot']: '#218cd6',
	['gcd']: '#d60808',
	['mitigation']: '#d60808',
	['shield']: '#d60808',
}

export default class HealingBreakdown extends Module {
	static handle = 'healingbreakdown'
	static title = 'Pie Charts'
	static i18n_id = i18nMark('ast.healingbreakdown.title')
	static dependencies = [
		'suggestions',
	]
	static displayOrder = 49

	_gcdHistory = new Map()

	_healHistory = new Map([
		['oGCD', 0],
		['GCD', 0],
		['HoT', 0],
		['Shield', 0],
		['Mitigation', 0],
	])


	constructor(...args) {
		super(...args)

		const shieldFilter = {by: 'player', abilityId: [STATUSES.NOCTURNAL_FIELD.id]}
		const mitigationFilter = {by: 'player', abilityId: [STATUSES.COLLECTIVE_UNCONSCIOUS_EFFECT.id]}

		this.addHook('cast', {by: 'player'}, this._onCast)
		this.addHook('heal', {by: 'player'}, this._onHeal)
		this.addHook('applybuff', shieldFilter, this._onShield)
		this.addHook('applybuff', mitigationFilter, this._onMitigate)
		this.addHook('complete', this._onComplete)
	}

	_onCast(event) {
		const actionId = event.ability.guid

		if(getAction(actionId).onGcd) {
			this._logGcdEvent(event)
		}

	}

	/**
	* Healing by type
	* 1. ogcd
	* 2. gcd
	* 3. hot
	* 4. shield mitigation
	* 5. other mitigation
	* 6. target based
	*
	*/
	_onHeal(event) {
		const actionId = event.ability.guid

		if(getAction(actionId).onGcd) {
			const currentAmount = this._healHistory.get('GCD')
			this._healHistory.set('GCD', currentAmount + event.amount)
		}

		if(event.tick && event.amount > 0) {
			const currentAmount = this._healHistory.get('HoT')
			this._healHistory.set('HoT', currentAmount + event.amount)
		}

		if(OGCD_HEALS.includes(actionId)){
			const currentAmount = this._healHistory.get('oGCD')
			this._healHistory.set('oGCD', currentAmount + event.amount)
		}

	}

	// makes a Map of actionIds:uses
	_logGcdEvent(event) {
		const actionId = event.ability.guid

		!this._gcdHistory.has(actionId) && this._gcdHistory.set(actionId, 0)

		const count = this._gcdHistory.get(actionId)
		this._gcdHistory.set(actionId, count + 1)

	}

	_onShield(event) {
		//
	}

	_onMitigate(event) {
		//
	}
	_onComplete(event) {
		// Finalise the history
		// TODO: sort out dps moves seperately
		this._gcdHistory = new Map([...this._gcdHistory.entries()].sort((a,b) =>  b[1] - a[1]) )
	}


	getPercentValues(key, mapObject) {
		const total = Array.from(mapObject.values()).reduce((sum, value) => sum + value)
		return Math.round((mapObject.get(key) / total) * 100)
	}

	output() {

		const gcdKeys = Array.from(this._gcdHistory.keys())
		console.log(gcdKeys)
		console.log(gcdKeys.map(actionId => getAction(actionId).name))
		const gcdData = {
			labels: gcdKeys.map(actionId => getAction(actionId).name),
			datasets: [{
				data: Array.from(this._gcdHistory.values()),
				backgroundColor: gcdKeys.map(actionId => CHART_COLOURS[actionId]),
			}],
		}

		const healKeys = Array.from(this._healHistory.keys())
		console.log(healKeys)
		const healData = {
			labels: healKeys,
			datasets: [{
				data: Array.from(this._healHistory.values()),
				backgroundColor: healKeys.map(type => HEAL_TYPE_COLORS[type]),
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
								<td>{this.getPercentValues(actionId, this._gcdHistory)}</td>
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
								<th>Type of heal</th>
								<th>% of heals</th>
							</tr>
						</thead>
						<tbody>
							{healKeys.map(healType => <tr key={healType}>
								<td><span
									className={styles.swatch}
									style={{backgroundColor: HEAL_TYPE_COLORS[healType]}}
								/></td>
								<td>{healType}</td>
								<td>{this.getPercentValues(healType, this._healHistory)}</td>
							</tr>)}
						</tbody>
					</table>
				</div>
			</Grid.Column>
			
		</Grid>
	}
}

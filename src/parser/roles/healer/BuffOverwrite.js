import _ from 'lodash'

import {i18nMark} from '@lingui/react'

import Module from 'parser/core/Module'

/**
   * TODO: Account for AST/SCH shield interactions.
   * TODO: Make graph of each overwrite event with the amount of uptime lost + people lost on.
 **/

export default class BuffOverwrite extends Module {
	static handle = 'buff-overwrite'
	static title = 'Buff Overwrite'
	static i18n_id = i18nMark('healer.buff-overwrite.title')
	static dependencies = []

	buffs = {
		/**
		  * ACTIONS.ASPECTED_BENEFIC.id: {
		  *    duration: 30000,
		  *    buff: STATUSES.ASPECTED_BENEFIC.id
		  *    isAoe: false,
		  * },
		 **/
	}

	_buffsByPlayer = {
		/**
		   * entityId: {
		   *     buffId: timestamp,
		   *     ...
		   * }
		 **/
	}

	buffOverwrite = {
		/**
		  * abilityID: [
		  *     {
		  *         timestamp: time in ms,
		  *         targets: [entityID, ...],
		  *         timeLost: time in ms of max time lost of all targets
		  *     },
		  * ],
		 **/
	}

	constructor(buffs, ...args) {
		super(...args)

		this.buffs = buffs

		const filterSingle = {
			by: 'player',
			abilityId: Object.keys(this.buffs)
				.filter(id => !this.buffs[id].isAoe)
				.map(id => parseInt(id)),
		}
		const filterAoe = {
			by: 'player',
			abilityId: Object.keys(this.buffs)
				.filter(id => this.buffs[id].isAoe)
				.map(id => parseInt(id)),
		}
		const filterBuff = {
			by: 'player',
			abilityId: Object.keys(this.buffs)
				.map(id => this.buffs[id].buff),
		}

		console.log(this.parser.fight.start_time)

		this.addHook('cast', filterSingle, this._onCastSingle)

		// For each cast, check who was effected (healed) and if they had the buff already (assumes if a person was healed they will also have the buff applied to them)
		this.addHook('cast', filterAoe, this._onCastAoe)
		this.addHook('heal', filterAoe, this._checkBuffApplyInstance)

		// Check refreshbuff instances for aoe again seperatly in case the buff doesn't also heal (won't work on shields if the shield doesn't refresh the buff)
		this.addHook('refreshbuff', filterAoe, this._checkBuffApplyInstance)

		this.addHook(['applybuff', 'refreshbuff'], filterBuff, this._onApplyBuff)
		this.addHook('removebuff', filterBuff, this._onRemoveBuff)
		this.addHook('complete', this._onSuperComplete)

	}

	getInstancesAbilityOverwrite(abilityID) {
		return this.buffOverwrite[abilityID] || []
	}
	getTotalTimeLost(abilityID) {
		return this.getInstancesAbilityOverwrite(abilityID).reduce((a, b) => a+b, 0)
	}
	getTotalGCDLost(abilityID) {
		return this.getInstancesAbilityOverwrite(abilityID).length
	}

	/**
	   * @param {number[]} abilityIDs - array of abilityIDs to include in the table.
	   * @returns {Object} - Table of all buff overwrite instances sorted in chronological order.
	 **/
	getTable(abilityIDs) {
		const instances = _.compact(_.flatten(abilityIDs.map(id => this.getInstancesAbilityOverwrite(id)))
			.sort((a, b) => b.timestamp - a.timestamp))

		console.log(instances)
	}

	_onCastSingle(event) {
		const abilityID = event.ability.guid
		const buffID = this.buffs[abilityID].buff
		const targetID = event.targetID
		const timestamp = event.timestamp

		if (!this._buffsByPlayer.hasOwnProperty(targetID)) {
			this._buffsByPlayer[targetID] = {}
		}

		if (!this.buffOverwrite.hasOwnProperty(abilityID)) {
			this.buffOverwrite[abilityID] = []
		}

		if (this._buffsByPlayer[targetID].hasOwnProperty(buffID)) {
			const lastCast = this._buffsByPlayer[targetID][buffID]
			if (lastCast !== null) {
				const timeDifference = this.buffs[abilityID].duration - (timestamp - lastCast)
				this.buffOverwrite[abilityID].push({
					timestamp: timestamp,
					targets: [targetID],
					timeLost: timeDifference,
				})
			}
		}
	}

	_onCastAoe(event) {
		const abilityID = event.ability.guid

		if (!this.buffOverwrite.hasOwnProperty(abilityID)) {
			this.buffOverwrite[abilityID] = []
		}

		this.buffOverwrite[abilityID].push({
			timestamp: event.timestamp,
			targets: [],
			timeLost: 0,
		})
	}

	_checkBuffApplyInstance(event) {
		const targetID = event.targetID
		const abilityID = event.ability.guid
		const buffID = this.buffs[abilityID].buff
		const castInstance = _.last(this.buffOverwrite[abilityID])

		if (!(this._buffsByPlayer.hasOwnProperty(targetID) && this._buffsByPlayer[targetID].hasOwnProperty(buffID) && this._buffsByPlayer[targetID][buffID] !== null)) {
			return
		}

		if (castInstance.targets.indexOf(targetID) > -1) {
			console.error(castInstance)
		}

		const timeDifference = this.buffs[abilityID].duration - (castInstance.timestamp - this._buffsByPlayer[targetID][buffID])

		castInstance.timeLost = Math.max(castInstance.timeLost, timeDifference)
		castInstance.targets.push(targetID)
	}

	_onApplyBuff(event) {
		if (!this._buffsByPlayer.hasOwnProperty(event.targetID)) {
			this._buffsByPlayer[event.targetID] = {}
		}
		this._buffsByPlayer[event.targetID][event.ability.guid] = event.timestamp
	}

	_onRemoveBuff(event) {
		if (this._buffsByPlayer[event.targetID]) {
			this._buffsByPlayer[event.targetID][event.ability.guid] = null
		}
	}

	_onSuperComplete() {
		Object.keys(this.buffOverwrite).forEach(abilityID => {
			this.buffOverwrite[abilityID] = this.buffOverwrite[abilityID].filter(obj => obj.timeLost > 0)
		})
	}
}

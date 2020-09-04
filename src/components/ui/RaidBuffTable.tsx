import {Trans} from '@lingui/react'
import {Ability} from 'fflogs'
import React from 'react'
import {Button, Table} from 'semantic-ui-react'
import {formatDuration} from 'utilities'
import {EntityStatuses} from 'parser/core/modules/EntityStatuses'
import {Status} from 'data/STATUSES'

export interface RaidBuffTarget {
	/**
	 * Displayed header
	 */
	header: React.ReactNode
	/**
	 * Accessor can either be a string, in which case this will resolve to the value assigned to the same key in the `targetsData` field in each entry,
	 * or a function resolving the entry to the `RaidBuffTargetData`.
	 */
	accessor: string | ((entry: RaidBuffTableEntry) => RaidBuffTargetData)
}

export interface RaidBuffNotes {
	/**
	 * Displayed header
	 */
	header: React.ReactNode
	/**
	 * Accessor can either be a string, in which case this will resolve to the value assigned to the same key in the `targetsData` field in each entry,
	 * or a function resolving the entry to the `RaidBuffTargetData`.
	 */
	accessor: string | ((entry: RaidBuffTableEntry) => React.ReactNode)
}

export interface RaidBuffTargetOutcome {
	/**
	 * True if the target was reached
	 */
	positive: boolean
	/**
	 * True if the target was not reached
	 */
	negative: boolean
}

export interface RaidBuffTargetData {
	/**
	 * Expected target number
	 */
	expected?: number
	/**
	 * Recorded number
	 */
	actual: number
	/**
	 * Optional function to override the default positive/negative highlighting
	 */
	targetComparator?: (actual: number, expected?: number) => RaidBuffTargetOutcome
}

export interface RaidBuffTableTargetData {
	/**
	 * Identifier to Target Data mapping
	 */
	[id: string]: RaidBuffTargetData
}

export interface RaidBuffTableNotesMap {
	/**
	 * Identifier to Notes mapping
	 */
	[id: string]: React.ReactNode
}

/**
 * Information about the buff status
 */
export interface RaidBuffStatus extends Status {
	/**
	 * Start point relative to fight start
	 */
	start: number
	/**
	 * End point relative to fight start
	 */
	end: number
}


/**
 * An actor hit by the raid buff
 */
export interface RaidBuffPlayer {
	/**
	 * 3-letter job code, lowercase
	 */
	job: string
	/**
	 * Name of actor hit
	 */
	name: string
	/**
	 * List of buffs actor received
	 */
	buffs: RaidBuffStatus[]
}

export interface RaidBuffTableEntry {
	/**
	 * Start point relative to fight start
	 */
	start: number
	/**
	 * End point relative to fight start
	 */
	end: number
	/**
	 * Map of pre calculated target data
	 */
	targetsData?: RaidBuffTableTargetData
	/**
	 * Map of pre calculated target data
	 */
	notesMap?: RaidBuffTableNotesMap
	/**
	 * RaidBuff to display that occurs during this entry
	 */
	hitList: RaidBuffPlayer[]
}

interface RaidBuffTableProps {
	/**
	 * List of Targets to display, consisting of the displayed header and the accessor to resolve the actual and expected values
	 */
	targets?: RaidBuffTarget[]
	/**
	 * List of Notes to display, consisting of the displayed header and the accessor to resolve the value
	 */
	notes?: RaidBuffNotes[]
	/**
	 * List of table entries, consisting of a time frame and the rotation, with optionally a pre calculated target data
	 */
	data: RaidBuffTableEntry[]
	/**
	 * Optional Callback to display the jump to time button.
	 * Usually this should be a pass through of the `Timeline.show` function.
	 * @param start
	 * @param end
	 * @param scrollTo
	 */
	onGoto?: (start: number, end: number, scrollTo?: boolean) => void
	/**
	 * Optional property to provide a JSX.Element (translation tag) for the header value.
	 * Defaults to "RaidBuff"
	 */
	headerTitle?: JSX.Element
}

interface RaidBuffTableRowProps {
	/**
	 * List of Targets to display, consisting of the displayed header and the accessor to resolve the actual and expected values
	 */
	targets: RaidBuffTarget[]
	/**
	 * List of Notes to display, consisting of the displayed header and the accessor to resolve the value
	 */
	notes: RaidBuffNotes[]
	/**
	 * Optional Callback to display the jump to time button.
	 * Usually this should be a pass through of the `Timeline.show` function.
	 * @param start
	 * @param end
	 * @param scrollTo
	 */
	onGoto?: (start: number, end: number, scrollTo?: boolean) => void
}

export class RaidBuffTable extends React.Component<RaidBuffTableProps> {
	static defaultTargetComparator(actual: number, expected?: number): RaidBuffTargetOutcome {
		return {
			positive: expected === undefined ? false : actual >= expected,
			negative: expected === undefined ? false : actual < expected,
		}
	}

	static targetAccessorResolver = (entry: RaidBuffTableEntry, target: RaidBuffTarget): RaidBuffTargetData => {
		if (typeof target.accessor === 'string' && entry.targetsData != null) {
			return entry.targetsData[target.accessor]
		} else if (typeof target.accessor === 'function') {
			return target.accessor(entry)
		} else {
			return {
				actual: 0,
				expected: 0,
			}
		}
	}

	static notesAccessorResolver = (entry: RaidBuffTableEntry, note: RaidBuffNotes): React.ReactNode => {
		if (typeof note.accessor === 'string' && entry.notesMap != null) {
			return entry.notesMap[note.accessor]
		} else if (typeof note.accessor === 'function') {
			return note.accessor(entry)
		} else {
			return null
		}
	}

	static TargetCell = ({actual, expected, targetComparator}: RaidBuffTargetData) => {
		if (targetComparator === undefined) {
			targetComparator = RaidBuffTable.defaultTargetComparator
		}
		const targetOutcome = targetComparator(actual, expected)

		return <Table.Cell
			textAlign="center"
			positive={targetOutcome.positive}
			negative={targetOutcome.negative}
		>
			{actual}/{expected === undefined ? '-' : expected}
		</Table.Cell>
	}

	static Row = ({onGoto, targets, notes, notesMap, start, end, targetsData, hitList}: RaidBuffTableRowProps & RaidBuffTableEntry) =>
		<Table.Row>
			<Table.Cell>
				{typeof onGoto === 'function' && <Button
					circular
					compact
					size="mini"
					icon="time"
					onClick={() => onGoto(start, end)}
				/>}<span style={{marginRight: 5}}>{formatDuration(start, {secondPrecision: 0})}</span>
			</Table.Cell>
			{
				targets
					.map(target => RaidBuffTable.targetAccessorResolver({start, end, targetsData, hitList}, target))
					.map((targetEntry, i) => <RaidBuffTable.TargetCell key={`target_${i}`} {...targetEntry} />)
			}
			<Table.Cell>
				{/* list of players hit */}
			</Table.Cell>
			{
				notes
					.map(note => RaidBuffTable.notesAccessorResolver({start, end, targetsData, notesMap, hitList}, note))
					.map((noteEntry, i) =>
						<Table.Cell
							key={`notes_${i}`}
							textAlign="center"
						>
							{noteEntry}
						</Table.Cell>,
					)
			}
		</Table.Row>

	render(): React.ReactNode {
		const {
			targets,
			notes,
			data,
			onGoto,
			headerTitle,
		} = this.props

		return <Table compact unstackable celled>
			<Table.Header>
				<Table.Row>
					<Table.HeaderCell collapsing>
						<strong><Trans id="core.ui.raidbuff-table.header.time">Time</Trans></strong>
					</Table.HeaderCell>
					{
						(targets || []).map((target, i) =>
							<Table.HeaderCell key={`target_header_${i}`} textAlign="center" collapsing>
								<strong>{target.header}</strong>
							</Table.HeaderCell>,
						)
					}
					<Table.HeaderCell>
						<strong>{(headerTitle) ? headerTitle : <Trans id="core.ui.raidbuff-table.header.rotation">RaidBuff</Trans>}</strong>
					</Table.HeaderCell>
					{
						(notes || []).map((note, i) =>
							<Table.HeaderCell key={`note_header_${i}`} textAlign="center" collapsing>
								<strong>{note.header}</strong>
							</Table.HeaderCell>,
						)
					}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{
					data.map((entry) =>
						<RaidBuffTable.Row key={entry.start} onGoto={onGoto} targets={targets || []} notes={notes || []} {...entry} />,
					)
				}
			</Table.Body>
		</Table>
	}
}

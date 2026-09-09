"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { type ReactNode, useId } from "react";

import { Button } from "../Button/Button.tsx";
import {
	Command,
	CommandInput,
	CommandItem,
	CommandList,
} from "../Command/Command.tsx";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "../Popover/Popover.tsx";

export interface ComboboxProps<T> {
	/** Controlled open state. */
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
	/** Controlled search text. The component never filters or sorts. */
	readonly query: string;
	readonly onQueryChange: (query: string) => void;
	/** Items to show, already filtered and ordered by the caller. */
	readonly items: readonly T[];
	readonly getKey: (item: T) => string;
	readonly renderItem: (item: T) => ReactNode;
	/** When true for an item, that row is rendered but cannot be selected or arrow-navigated to. */
	readonly isItemDisabled?: (item: T) => boolean;
	/** Never called for an item where `isItemDisabled` returns true. */
	readonly onSelect: (item: T) => void;
	/** Key of the item to mark as the current selection. */
	readonly selectedKey?: string | undefined;
	/** Accessible name for the search field. */
	readonly inputLabel: string;
	/** Accessible name for the trigger. */
	readonly triggerLabel: string;
	/** What the closed trigger shows. */
	readonly triggerContent: ReactNode;
	/** Shown when `items` is empty and not loading. */
	readonly emptyContent: ReactNode;
	/** When true, the list region shows `loadingContent` instead of items/empty. */
	readonly loading?: boolean;
	readonly loadingContent?: ReactNode;
}

/**
 * A generic controlled combobox: a `role="combobox"` trigger opening a
 * `Popover` over a `Command` list. The caller owns filtering and ordering
 * (`cmdk` filtering is disabled) and every piece of state. Selecting an item
 * or pressing Escape closes the popover and returns focus to the trigger.
 */
export function Combobox<T>({
	open,
	onOpenChange,
	query,
	onQueryChange,
	items,
	getKey,
	renderItem,
	isItemDisabled,
	onSelect,
	selectedKey,
	inputLabel,
	triggerLabel,
	triggerContent,
	emptyContent,
	loading = false,
	loadingContent,
}: ComboboxProps<T>) {
	const listId = useId();
	const hasNoOptions = loading || items.length === 0;

	function handleSelect(item: T) {
		if (isItemDisabled?.(item) === true) {
			return;
		}
		onSelect(item);
		onOpenChange(false);
	}

	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			<PopoverTrigger asChild>
				<Button
					data-appearance="outlined"
					// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- combobox trigger opening a popover + command list, not a native select
					role="combobox"
					aria-label={triggerLabel}
					aria-controls={listId}
					aria-expanded={open}
				>
					{triggerContent}
					<ChevronsUpDown aria-hidden="true" />
				</Button>
			</PopoverTrigger>
			<PopoverContent id={listId} className="combobox-content">
				<Command shouldFilter={false} label={inputLabel}>
					<CommandInput
						aria-label={inputLabel}
						value={query}
						onValueChange={onQueryChange}
					/>
					{/* cmdk's CommandList hard-codes role="listbox" and owns its own
					    id (the input's aria-controls target). An empty listbox trips
					    aria-required-children, so when there are no options the list
					    is `hidden` (kept mounted for the aria-controls target) and
					    the loading / empty message renders as a live region sibling. */}
					<CommandList hidden={hasNoOptions || undefined}>
						{hasNoOptions
							? null
							: items.map((item) => {
									const key = getKey(item);
									const disabled = isItemDisabled?.(item) === true;
									const selected =
										selectedKey !== undefined && selectedKey === key;
									return (
										<CommandItem
											key={key}
											value={key}
											disabled={disabled}
											aria-current={selected ? "true" : undefined}
											onSelect={() => handleSelect(item)}
										>
											{renderItem(item)}
											{selected ? (
												<Check
													aria-hidden="true"
													className="combobox-selected-check"
												/>
											) : null}
										</CommandItem>
									);
								})}
					</CommandList>
					{loading ? (
						<div
							role="status"
							data-slot="combobox-loading"
							className="combobox-loading"
						>
							{loadingContent}
						</div>
					) : items.length === 0 ? (
						<div
							role="status"
							data-slot="combobox-empty"
							className="combobox-empty"
						>
							{emptyContent}
						</div>
					) : null}
				</Command>
			</PopoverContent>
		</Popover>
	);
}

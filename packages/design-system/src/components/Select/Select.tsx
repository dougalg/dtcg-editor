"use client";

import cn from "clsx";
import type * as React from "react";
import { createElement, type ReactElement } from "react";

/**
 * A native `<select>` — no JS popup library. Modern browsers that support
 * the customizable-`<select>` model (`appearance: base-select`,
 * `::picker(select)`) get the fully styled control in `Select.css`; older
 * browsers fall back to the platform dropdown (accepted trade-off).
 *
 * `onValueChange(value)` mirrors the old Radix API; a raw `onChange` is
 * still forwarded. All other props (`aria-label`, `id`, `name`,
 * `disabled`, `required`, `value`/`defaultValue`, …) land on the
 * `<select>`.
 */
interface SelectProps extends Omit<React.ComponentProps<"select">, "onChange"> {
	readonly onValueChange?: (value: string) => void;
	readonly onChange?: React.ComponentProps<"select">["onChange"];
}

function Select({
	className,
	children,
	onValueChange,
	onChange,
	...props
}: SelectProps): ReactElement {
	return (
		<select
			data-slot="select"
			className={cn("select", className)}
			onChange={(event) => {
				onValueChange?.(event.currentTarget.value);
				onChange?.(event);
			}}
			{...props}
		>
			{children}
		</select>
	);
}

/**
 * Optional rich trigger for the customizable-`<select>` model — renders the
 * `<button>` child that replaces the UA-provided one. Omit it to use the
 * platform's default button (shows the selected option's text), which is
 * all most selects need. It carries no interactive semantics of its own
 * (the `<select>` is the control); `aria-hidden` keeps it out of the a11y
 * tree in browsers that don't yet special-case it.
 */
function SelectTrigger({
	className,
	children,
	type = "button",
	...props
}: React.ComponentProps<"button">): ReactElement {
	return (
		<button
			type={type}
			data-slot="select-trigger"
			className={cn("select-trigger", className)}
			aria-hidden="true"
			tabIndex={-1}
			{...props}
		>
			{children}
			<span aria-hidden="true" data-slot="select-icon" className="select-icon">
				▾
			</span>
		</button>
	);
}

/** Mirrors the selected option's content inside a `SelectTrigger`. */
function SelectValue({
	className,
	placeholder,
	...props
}: React.ComponentProps<"span"> & {
	readonly placeholder?: React.ReactNode;
}): ReactElement {
	return createElement("selectedcontent", {
		"data-slot": "select-value",
		className: cn("select-value", className),
		...props,
	});
}

/**
 * Passthrough: a native `<select>`'s options are its direct children and
 * its popup is styled via `::picker(select)`, so there is no wrapper
 * element to render.
 */
function SelectContent({
	children,
}: React.ComponentProps<"div">): ReactElement {
	return <>{children}</>;
}

function SelectItem({
	className,
	children,
	...props
}: React.ComponentProps<"option">): ReactElement {
	return (
		<option
			data-slot="select-item"
			className={cn("select-item", className)}
			{...props}
		>
			{children}
		</option>
	);
}

function SelectGroup({
	children,
	...props
}: React.ComponentProps<"optgroup">): ReactElement {
	return (
		<optgroup data-slot="select-group" {...props}>
			{children}
		</optgroup>
	);
}

/** A non-selectable heading row, for parity with the old compound API. */
function SelectLabel({
	className,
	...props
}: React.ComponentProps<"option">): ReactElement {
	return (
		<option
			disabled
			data-slot="select-label"
			className={cn("select-label", className)}
			{...props}
		/>
	);
}

function SelectSeparator({
	className,
	...props
}: React.ComponentProps<"hr">): ReactElement {
	return (
		<hr
			data-slot="select-separator"
			className={cn("select-separator", className)}
			{...props}
		/>
	);
}

/** Native `<select>` scrolls its own popup — kept only for API compatibility. */
function SelectScrollUpButton(): null {
	return null;
}
function SelectScrollDownButton(): null {
	return null;
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};

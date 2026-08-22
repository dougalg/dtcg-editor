"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import cn from "clsx";
import type * as React from "react";

interface SwitchProps
	extends React.ComponentProps<typeof SwitchPrimitive.Root> {
	/** Optional content (e.g. an icon) rendered inside the sliding thumb. */
	thumbIcon?: React.ReactNode;
}

function Switch({ className, thumbIcon, ...props }: SwitchProps) {
	return (
		<SwitchPrimitive.Root className={cn("switch", className)} {...props}>
			<SwitchPrimitive.Thumb className={cn("switch-thumb")}>
				{thumbIcon}
			</SwitchPrimitive.Thumb>
		</SwitchPrimitive.Root>
	);
}

export { Switch };

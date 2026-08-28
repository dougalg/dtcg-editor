import { useState } from "react";

export const ColorField = () => {
	const [space, setSpace] = useState("#");
	const [value, setValue] = useState("fff");
	const swatchColor = `${space}${value}`;

	return (
		<>
			<div
				className="swatch"
				style={{
					background: swatchColor,
				}}
			/>
			<select name="space" onChange={(e) => setSpace(e.target.value)}>
				<option>#</option>
				<option>hsl</option>
			</select>
			<input
				type="text"
				name="value"
				onChange={(e) => setValue(e.target.value)}
			/>
		</>
	);
	// srgb
	// srgb linear
	// hsl
	// hwb
	// cielab
	// lch
	// oklab
	// oklch
	// Display P3
	// A98 RGB
	// ProPhoto RGB
	// Rec 202
	// XYZ-D65
	// XYZ-D50
};

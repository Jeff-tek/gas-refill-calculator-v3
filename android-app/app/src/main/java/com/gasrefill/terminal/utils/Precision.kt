package com.gasrefill.terminal.utils

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

object Precision {
    private val format = DecimalFormat("#,###.00", DecimalFormatSymbols(Locale.US)).apply {
        isDecimalSeparatorAlwaysShown = true
        minimumFractionDigits = 2
        maximumFractionDigits = 2
        isGroupingUsed = true
    }

    /** Truncate to 2 decimal places (toward zero). */
    fun trunc2(num: Double): Double {
        if (!num.isFinite()) return Double.NaN
        val sign = if (num < 0) -1.0 else 1.0
        val scaled = kotlin.math.abs(num) * 100.0
        return (scaled.toLong().toDouble() / 100.0) * sign
    }

    /** Format with thousands separator and 2 decimals. */
    fun fmt2(num: Double): String {
        val t = trunc2(num)
        if (!t.isFinite()) return "0.00"
        return format.format(t)
    }

    /** Format as naira with symbol. */
    fun naira(num: Double): String = "\u20A6${fmt2(num)}"

    /** Format as kg value. */
    fun kg(num: Double): String = fmt2(num)

    /** Parse a raw input string. */
    data class Parsed(val empty: Boolean, val value: Double, val nan: Boolean)

    fun parseField(raw: String?): Parsed {
        val s = (raw ?: "").trim().replace(",", "")
        if (s.isEmpty()) return Parsed(true, Double.NaN, false)
        val v = s.toDoubleOrNull()
        return if (v != null) Parsed(false, v, false)
        else Parsed(false, Double.NaN, true)
    }
}

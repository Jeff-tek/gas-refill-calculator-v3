package com.gasrefill.terminal.models

import kotlinx.serialization.Serializable

@Serializable
data class Transaction(
    val ts: Long,
    val gsp: Double,
    val csr: Double,
    val mode: String, // "A" = price, "B" = kg
    val input: Double,
    val finalKg: Double,
    val filledKg: Double,
    val cost: Double? = null,
    val paymentMethod: String, // "cash" or "transfer"
    val bottleId: String,
    val costPricePerKg: Double? = null
)

@Serializable
data class Bottle(
    val id: String,
    val name: String,
    val capacity: Double,
    val remaining: Double,
    val createdAt: Long,
    val closedAt: Long? = null
)

@Serializable
data class Expense(
    val id: String,
    val date: Long,
    val category: String,
    val description: String,
    val amount: Double
)

@Serializable
data class BusinessSettings(
    val businessName: String = "Gas Refill Terminal",
    val receiptFooter: String = "Thank you for your patronage!",
    val currencySymbol: String = "\u20A6",
    val currencyCode: String = "NGN"
)

@Serializable
data class BackupData(
    val version: Int,
    val exportedAt: Long,
    val businessName: String = "",
    val transactions: List<Transaction> = emptyList(),
    val bottles: List<Bottle> = emptyList(),
    val expenses: List<Expense> = emptyList(),
    val settings: BusinessSettings = BusinessSettings()
)

package com.gasrefill.terminal

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.gasrefill.terminal.models.*
import com.gasrefill.terminal.ui.theme.*
import com.gasrefill.terminal.utils.Precision
import com.gasrefill.terminal.utils.Storage
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            GasRefillTheme(darkTheme = true) {
                GasRefillApp()
            }
        }
    }
}

@Composable
fun GasRefillApp() {
    val context = LocalContext.current
    var gsp by remember { mutableStateOf(Storage.loadGsp(context)) }
    var csr by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf("A") }
    var history by remember { mutableStateOf(Storage.loadHistory(context)) }
    var bottles by remember { mutableStateOf(Storage.loadBottles(context)) }
    var expenses by remember { mutableStateOf(Storage.loadExpenses(context)) }
    var costPrice by remember { mutableStateOf(Storage.loadCostPrice(context)) }
    var showDashboard by remember { mutableStateOf(false) }
    var showSettings by remember { mutableStateOf(false) }
    var showExpenses by remember { mutableStateOf(false) }

    val activeBottle = bottles.find { it.closedAt == null }

    // Validation + calculation
    val calc = remember(gsp, csr, amount, mode) {
        val g = Precision.parseField(gsp)
        val c = Precision.parseField(csr)
        val a = Precision.parseField(amount)
        val errs = mutableListOf<String>()

        if (g.empty || g.nan || g.value <= 0) errs.add("GSP is required")
        if (!c.empty && c.nan) errs.add("CSR invalid")
        if (a.empty || a.nan || a.value < 0) errs.add(if (mode == "A") "Price required" else "Kg required")

        if (errs.isNotEmpty()) return@remember CalcResult.Error(errs)

        val finalKg: Double
        val filledKg: Double
        val cost: Double?

        if (mode == "A") {
            filledKg = a.value / g.value
            finalKg = (c.valueOrZero() + filledKg)
            cost = null
        } else {
            filledKg = a.value
            finalKg = c.valueOrZero() + a.value
            cost = a.value * g.value
        }

        CalcResult.Success(g.value, c.valueOrZero(), a.value, finalKg, filledKg, cost)
    }

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkBg)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Gas Refill", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Cream)
                Spacer(Modifier.weight(1f))
                // Dashboard button
                TextButton(onClick = { showDashboard = true }) {
                    Text("📊", fontSize = 14.sp)
                }
                // Expenses button
                TextButton(onClick = { showExpenses = true }) {
                    Text("📄", fontSize = 14.sp)
                }
                // Settings button
                TextButton(onClick = { showSettings = true }) {
                    Text("⚙️", fontSize = 14.sp)
                }
            }
        },
        containerColor = DarkBg
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // GSP Chip
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkPanel, RoundedCornerShape(8.dp))
                    .border(1.dp, Etch, RoundedCornerShape(8.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("GSP", color = AccentAmber, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                Spacer(Modifier.width(8.dp))
                Text("₦", color = AccentAmber, fontSize = 14.sp)
                OutlinedTextField(
                    value = gsp,
                    onValueChange = { gsp = it; Storage.saveGsp(context, it) },
                    modifier = Modifier.width(80.dp).height(40.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = AccentAmber,
                        unfocusedTextColor = AccentAmber,
                        focusedBorderColor = AccentAmber,
                        unfocusedBorderColor = AccentAmber
                    ),
                    textStyle = LocalTextStyle.current.copy(fontWeight = FontWeight.Bold)
                )
                Text("/kg", color = Faint, fontSize = 10.sp)
            }

            Spacer(Modifier.height(16.dp))

            // Main Console
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkPanel, RoundedCornerShape(12.dp))
                    .border(1.dp, Etch, RoundedCornerShape(12.dp))
                    .padding(24.dp)
            ) {
                Column {
                    // Readout
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .background(if (calc is CalcResult.Success) AccentFlame else AccentDanger, RoundedCornerShape(50))
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "Expected Final Scale Reading",
                            color = Muted,
                            fontSize = 10.sp,
                            letterSpacing = 2.sp
                        )
                    }

                    Text(
                        text = if (calc is CalcResult.Success) Precision.kg(calc.finalKg) else "0.00",
                        fontSize = 48.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (calc is CalcResult.Success) Cream else Faint
                    )

                    Spacer(Modifier.height(12.dp))
                    HorizontalDivider(color = Etch)

                    // Secondary info
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        val secondaryLabel = if (mode == "A") "Kg filled" else "Cost"
                        val secondaryValue = when (calc) {
                            is CalcResult.Success -> if (mode == "A") Precision.kg(calc.filledKg) + " kg" else Precision.naira(calc.cost ?: 0.0)
                            else -> "—"
                        }
                        Text(secondaryLabel, color = Muted, fontSize = 10.sp)
                        Text(secondaryValue, color = AccentAmber, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    }

                    // Errors
                    if (calc is CalcResult.Error) {
                        Spacer(Modifier.height(8.dp))
                        calc.errs.forEach { err ->
                            Text(err, color = AccentDanger, fontSize = 11.sp)
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // Mode toggle
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(DarkPanel2, RoundedCornerShape(8.dp))
                            .padding(4.dp)
                    ) {
                        listOf("A" to "Price ₦", "B" to "Kg wanted").forEach { (key, label) ->
                            TextButton(
                                onClick = { mode = key },
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    label,
                                    color = if (mode == key) Cream else Muted,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(12.dp))

                    // Input fields
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Current Scale Reading", color = Muted, fontSize = 10.sp)
                            OutlinedTextField(
                                value = csr,
                                onValueChange = { csr = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                placeholder = { Text("0.00", color = Faint) },
                                suffix = { Text("kg", color = Faint) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Cream,
                                    unfocusedTextColor = Cream,
                                    cursorColor = AccentFlame
                                )
                            )
                        }
                        Spacer(Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(if (mode == "A") "Price customer pays" else "Kg customer wants", color = Muted, fontSize = 10.sp)
                            OutlinedTextField(
                                value = amount,
                                onValueChange = { amount = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                placeholder = { Text("0.00", color = Faint) },
                                prefix = if (mode == "A") {{ Text("₦", color = Faint) }} else null,
                                suffix = if (mode == "B") {{ Text("kg", color = Faint) }} else null,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedTextColor = Cream,
                                    unfocusedTextColor = Cream,
                                    cursorColor = AccentFlame
                                )
                            )
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // Record button
                    Button(
                        onClick = {
                            if (calc is CalcResult.Success && activeBottle != null) {
                                val t = Transaction(
                                    ts = System.currentTimeMillis(),
                                    gsp = calc.gsp,
                                    csr = calc.csr,
                                    mode = mode,
                                    input = calc.input,
                                    finalKg = calc.finalKg,
                                    filledKg = calc.filledKg,
                                    cost = calc.cost,
                                    paymentMethod = "cash",
                                    bottleId = activeBottle.id,
                                    costPricePerKg = Precision.parseField(costPrice).let { if (!it.empty && !it.nan) it.value else null }
                                )
                                history = listOf(t) + history
                                Storage.saveHistory(context, history)
                                // Update bottle
                                bottles = bottles.map { b ->
                                    if (b.id == activeBottle.id) b.copy(remaining = maxOf(0.0, b.remaining - calc.filledKg))
                                    else b
                                }
                                Storage.saveBottles(context, bottles)
                                Toast.makeText(context, "Fill recorded", Toast.LENGTH_SHORT).show()
                            }
                        },
                        enabled = calc is CalcResult.Success && activeBottle != null,
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(24.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentFlame)
                    ) {
                        Text("RECORD FILL", fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Today's Summary
            val todaySummary = remember(history) {
                val today = dayKey(System.currentTimeMillis())
                history.filter { dayKey(it.ts) == today }.let { txns ->
                    SummaryData(
                        kg = txns.sumOf { it.filledKg },
                        rev = txns.sumOf { revenueOf(it) },
                        count = txns.size
                    )
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceToday),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Today", color = AccentFlameHi, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                    Spacer(Modifier.height(8.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                        StatItem("kg sold", Precision.kg(todaySummary.kg))
                        StatItem("revenue", Precision.naira(todaySummary.rev))
                        StatItem("fills", todaySummary.count.toString())
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Sales Log
            Text("Sales Log", color = Muted, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 2.sp)
            Spacer(Modifier.height(8.dp))

            if (history.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No fills recorded yet", color = Faint)
                }
            } else {
                history.take(50).forEach { t ->
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkPanel2),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                if (t.mode == "A") "₦" else "KG",
                                color = AccentFlameHi,
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp
                            )
                            Spacer(Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(Precision.kg(t.finalKg) + " kg", fontWeight = FontWeight.Bold, color = Cream, fontSize = 14.sp)
                                Text(Precision.naira(t.gsp) + "/kg", color = Muted, fontSize = 11.sp)
                            }
                            Text(
                                Precision.kg(t.filledKg) + " kg",
                                color = if (t.mode == "A") AccentFlameHi else AccentAmber,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }

    // Dashboard dialog
    if (showDashboard) {
        DashboardDialog(
            transactions = history,
            expenses = expenses,
            costPrice = costPrice,
            onDismiss = { showDashboard = false }
        )
    }

    // Settings dialog
    if (showSettings) {
        SettingsDialog(
            currentCostPrice = costPrice,
            onSave = { newCostPrice ->
                costPrice = newCostPrice
                Storage.saveCostPrice(context, newCostPrice)
                showSettings = false
            },
            onDismiss = { showSettings = false }
        )
    }

    // Expenses dialog
    if (showExpenses) {
        ExpensesDialog(
            expenses = expenses,
            onExpensesChanged = {
                expenses = it
                Storage.saveExpenses(context, it)
            },
            onDismiss = { showExpenses = false }
        )
    }
}

// Helper composables
@Composable
fun StatItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontWeight = FontWeight.Bold, color = Cream, fontSize = 18.sp)
        Text(label, color = Faint, fontSize = 9.sp, letterSpacing = 1.sp)
    }
}

@Composable
fun DashboardDialog(transactions: List<Transaction>, expenses: List<Expense>, costPrice: String, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("📊 Dashboard", fontWeight = FontWeight.Bold) },
        text = {
            val totalKg = transactions.sumOf { it.filledKg }
            val totalRev = transactions.sumOf { revenueOf(it) }
            val cp = Precision.parseField(costPrice).let { if (!it.empty && !it.nan) it.value else 0.0 }
            val totalCost = if (cp > 0) transactions.sumOf { it.filledKg * cp } else 0.0
            val totalExp = expenses.sumOf { it.amount }
            val profit = totalRev - totalCost - totalExp

            Column {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    StatItem("Revenue", Precision.naira(totalRev))
                    StatItem("Kg Sold", Precision.kg(totalKg))
                    StatItem("Fills", transactions.size.toString())
                }
                if (cp > 0) {
                    Spacer(Modifier.height(8.dp))
                    HorizontalDivider()
                    Text("Revenue: ${Precision.naira(totalRev)}", fontSize = 13.sp)
                    Text("Gas Cost: -${Precision.naira(totalCost)}", color = AccentDanger, fontSize = 13.sp)
                    if (totalExp > 0) Text("Expenses: -${Precision.naira(totalExp)}", color = AccentDanger, fontSize = 13.sp)
                    Text(
                        "Net Profit: ${Precision.naira(kotlin.math.abs(profit))}",
                        color = if (profit >= 0) Color(0xFF428619) else AccentDanger,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp
                    )
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}

@Composable
fun SettingsDialog(currentCostPrice: String, onSave: (String) -> Unit, onDismiss: () -> Unit) {
    var costPrice by remember { mutableStateOf(currentCostPrice) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("⚙️ Business Settings", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Cost Price per kg (what you pay)", color = Muted, fontSize = 12.sp)
                OutlinedTextField(
                    value = costPrice,
                    onValueChange = { costPrice = it },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
            }
        },
        confirmButton = { TextButton(onClick = { onSave(costPrice) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
fun ExpensesDialog(expenses: List<Expense>, onExpensesChanged: (List<Expense>) -> Unit, onDismiss: () -> Unit) {
    var localExpenses by remember { mutableStateOf(expenses) }
    var category by remember { mutableStateOf("transport") }
    var description by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("📄 Expenses", fontWeight = FontWeight.Bold) },
        text = {
            Column {
                // Add form
                Row {
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        placeholder = { Text("Description") }
                    )
                    Spacer(Modifier.width(4.dp))
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { amount = it },
                        modifier = Modifier.width(80.dp),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        placeholder = { Text("Amount") }
                    )
                }
                Spacer(Modifier.height(4.dp))
                Button(
                    onClick = {
                        val amt = amount.toDoubleOrNull()
                        if (description.isNotBlank() && amt != null && amt > 0) {
                            val e = Expense(
                                id = UUID.randomUUID().toString(),
                                date = System.currentTimeMillis(),
                                category = category,
                                description = description,
                                amount = amt
                            )
                            localExpenses = listOf(e) + localExpenses
                            onExpensesChanged(localExpenses)
                            description = ""
                            amount = ""
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                ) { Text("Add Expense") }

                Spacer(Modifier.height(8.dp))
                if (localExpenses.isEmpty()) {
                    Text("No expenses yet", color = Faint)
                } else {
                    localExpenses.take(20).forEach { e ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(e.description, fontSize = 13.sp, modifier = Modifier.weight(1f))
                            Text(Precision.naira(e.amount), color = AccentDanger, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text("Total: ${Precision.naira(localExpenses.sumOf { it.amount })}", fontWeight = FontWeight.Bold)
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } }
    )
}

// Helper functions
fun dayKey(ts: Long): String {
    val cal = java.util.Calendar.getInstance().apply { timeInMillis = ts }
    return "${cal.get(java.util.Calendar.YEAR)}-${cal.get(java.util.Calendar.MONTH) + 1}-${cal.get(java.util.Calendar.DAY_OF_MONTH)}"
}

fun revenueOf(t: Transaction): Double {
    return if (t.mode == "A") t.input else (t.cost ?: t.input * t.gsp)
}

sealed interface CalcResult {
    data class Success(
        val gsp: Double,
        val csr: Double,
        val input: Double,
        val finalKg: Double,
        val filledKg: Double,
        val cost: Double?
    ) : CalcResult
    data class Error(val errs: List<String>) : CalcResult
}

data class SummaryData(val kg: Double, val rev: Double, val count: Int)

fun Double.valueOrZero() = if (this.isNaN()) 0.0 else this

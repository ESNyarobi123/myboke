package com.myboke.app

import com.myboke.app.core.util.Country
import com.myboke.app.core.util.Phone
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Majaribio ya kusafisha na kuthibitisha namba za simu.
 *
 * Backend inahifadhi namba ya Tanzania kwa `0` ya mwanzo (`0712345678`),
 * na nchi nyingine kwa msimbo wa nchi (`254712345678`). Kanuni hizi ni
 * msingi wa kuingia/kujisajili kwa usahihi.
 */
class PhoneTest {

    @Test
    fun `national number strips country code and leading zero`() {
        assertEquals("712345678", Phone.national("+255 712 345 678", Country.TZ))
        assertEquals("712345678", Phone.national("0712345678", Country.TZ))
        assertEquals("712345678", Phone.national("255712345678", Country.TZ))
        assertEquals("712345678", Phone.national("712345678", Country.TZ))
        assertEquals("712345678", Phone.national("0712-345-678", Country.TZ))
    }

    @Test
    fun `national number respects the selected country`() {
        assertEquals("712345678", Phone.national("+254 712 345 678", Country.KE))
        assertEquals("701234567", Phone.national("0701234567", Country.KE))
        assertEquals("78123456", Phone.national("+250 78 123 456", Country.RW))
    }

    @Test
    fun `backend format uses local zero for Tanzania only`() {
        assertEquals("0712345678", Phone.forBackend("+255712345678", Country.TZ))
        assertEquals("0712345678", Phone.forBackend("712345678", Country.TZ))
        assertEquals("254712345678", Phone.forBackend("0712345678", Country.KE))
        assertEquals("", Phone.forBackend("", Country.TZ))
    }

    @Test
    fun `e164 format always includes the dial code`() {
        assertEquals("+255712345678", Phone.e164("0712345678", Country.TZ))
        assertEquals("+254712345678", Phone.e164("0712345678", Country.KE))
    }

    @Test
    fun `validation checks length and mobile prefix`() {
        assertTrue(Phone.isValid("0712345678", Country.TZ))
        assertTrue(Phone.isValid("+255 712 345 678", Country.TZ))
        assertFalse(Phone.isValid("071234567", Country.TZ), "tarakimu 8 si sahihi TZ")
        assertFalse(Phone.isValid("0812345678", Country.TZ), "namba za mezani (0 8) hazikubaliki")
        assertFalse(Phone.isValid("", Country.TZ))
        assertTrue(Phone.isValid("0701234567", Country.KE))
        assertFalse(Phone.isValid("0712345678", Country.US), "US needs 10 digits")
    }

    @Test
    fun `display format groups digits readably`() {
        assertEquals("0712 345 678", Phone.pretty("0712345678", Country.TZ))
        assertEquals("+254 712 345 678", Phone.pretty("712345678", Country.KE))
        assertEquals("+1 234 567 8901", Phone.pretty("2345678901", Country.US))
        assertEquals("", Phone.pretty("", Country.TZ))
    }

    @Test
    fun `phone detection ignores emails`() {
        assertTrue(Phone.looksLikePhone("0712345678"))
        assertTrue(Phone.looksLikePhone("+255 712 345 678"))
        assertFalse(Phone.looksLikePhone("salma@myboke.co.tz"))
        assertFalse(Phone.looksLikePhone("123"))
    }

    @Test
    fun `login guesses the country from the typed number`() {
        assertEquals(Country.TZ, Phone.guessCountry("0712345678"))
        assertEquals(Country.TZ, Phone.guessCountry("+255712345678"))
        assertEquals(Country.KE, Phone.guessCountry("+254712345678"))
        assertEquals(Country.RW, Phone.guessCountry("+250781234567"))
        assertEquals(null, Phone.guessCountry("712345678"))
    }

    @Test
    fun `every country has a usable dial code and mask length`() {
        Country.entries.forEach { country ->
            assertTrue(country.dial.startsWith("+"), "${country.iso} dial code")
            assertTrue(country.dialDigits.all { it.isDigit() }, "${country.iso} dial digits")
            assertTrue(country.nationalLength in 8..10, "${country.iso} length")
            assertTrue(country.mobilePrefixes.isNotEmpty(), "${country.iso} prefixes")
            assertTrue(country.title.isNotBlank(), "${country.iso} title")
        }
    }
}

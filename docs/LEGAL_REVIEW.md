# Items requiring professional legal review (Egypt & Saudi Arabia)

The legal pages in `src/content/legal.ts` (served at `/{ar|en}/legal/{terms|privacy|intermediary|commission|disputes}`)
are **templates written by the development team, not legal advice**.

- They have not been reviewed by a lawyer.
- No legal approval, licence, or certification is claimed anywhere in the product.
- The platform setting `legal_review_status` is `"pending"`. The legal pages show a notice until
  it is changed.

Each item below must be confirmed or rewritten by qualified counsel in **Egypt** and in the
**Kingdom of Saudi Arabia** before launch. Bracketed text in the templates marks the open points.

## Corporate & licensing

1. **Legal entity details.** The name, commercial registration number and registered address of the
   TICOSHOV operating entity are placeholders in every document.
2. **Licensing.** Confirm whether operating an online B2B marketplace or commercial intermediary
   requires a licence or registration in each country. Examples to check:
   - Egypt: ITIDA, the e-commerce rules of the Consumer Protection Law, and commercial agency rules.
   - KSA: the Ministry of Commerce, the E-Commerce Law and its implementing regulations, and
     "Maroof" or the equivalent registration.
   Confirm also whether earning commission from Saudi parties creates a taxable presence or a
   **ZATCA/VAT** obligation.
3. **Commercial agency.** Confirm that the intermediary model is not characterised as a commercial
   agency or distributorship under Egyptian or Saudi law. Commercial agency registration rules can
   apply to foreign suppliers selling into KSA.

## Terms of service

4. **Governing law and dispute forum.** These are not chosen yet.
   - Options include Egyptian courts, Saudi courts, or arbitration (CRCICA / SCCA).
   - Consider a split approach for cross-border users.
5. **Limitation of liability and disclaimers.** Check the enforceability of the liability cap and
   of the "not a party to the contract" wording under both legal systems.
6. **Electronic acceptance.** Confirm that click-wrap acceptance at signup is valid. The current
   flow is a required checkbox, and the acceptance time is stored as `terms_accepted_at` in the user's auth metadata. Document versioning is not implemented yet. Confirm also the language-precedence
   clause (Arabic versus English version).
7. **Prohibited goods.** Map the list to the restricted-goods rules of both countries. The
   textile/garment labelling requirements (SASO) are not written into the terms.

## Privacy & data

8. **Data protection.**
   - Egypt: Personal Data Protection Law No. 151 of 2020 and its executive regulations, including
     licensing or registration with the Data Protection Center if required.
   - KSA: Personal Data Protection Law (SDAIA) and its implementing regulations.
9. **Cross-border transfer and hosting region.** Data is stored with Supabase in the region chosen
   at project creation. Confirm the lawful basis for transfers out of Egypt and KSA, or choose an
   in-region host.
10. **Retention periods.** These are not defined. Audit logs and trade documents are currently
    kept indefinitely. Define retention and deletion rules, including what must be kept for tax or
    commercial-records law.
11. **Data-subject rights procedure.** Define how access, correction and deletion requests are
    handled, and the timelines for each. Name a DPO or privacy contact if required.
12. **Message monitoring notice.** Staff can read conversations for moderation and dispute
    handling. Confirm that the disclosure is sufficient.

## Commission agreement

13. **Rate, payer, due date and late terms.** The template has blanks for the rate (the 3–8%
    guideline), the payer, the payment term (default 30 days after completion) and any late fee.
    Confirm whether late fees or interest are enforceable; there are Sharia-compliance
    considerations in KSA.
14. **Non-circumvention clause.** The duration ([12] months) and the scope of the clause that stops
    parties bypassing the platform need to be confirmed as enforceable.
15. **Invoicing and VAT/withholding** on the commission in each country.

## Payments & intermediary role

16. **The payment declaration model.** Confirm that the "payment confirmed" wording (a declaration
    by both parties, not verified by TICOSHOV) and the explicit statement that TICOSHOV does not
    collect or hold funds are enough to keep the platform outside payment-services or
    escrow regulation (CBE in Egypt, SAMA in KSA).
17. **The verified badge.** Confirm that the "verified" wording describes a document review only,
    and creates no warranty of the supplier's performance or product quality.

## Trade documents & compliance

18. **The EG→SA document checklist.** It is labelled as indicative only.
    - Confirm the disclaimer.
    - Have a licensed customs broker validate the list: commercial invoice, packing list,
      certificate of origin, bill of lading/AWB, SASO/SABER conformity for textiles, and
      chamber-of-commerce legalisation.

## Dispute procedure

19. **Escalation path.** Confirm the non-binding facilitation wording, the response-time targets
    ([2] business days), and that resolving a dispute on the platform does not prejudice either
    party's legal remedies.

---

**When review is complete:**

1. Update `src/content/legal.ts` with the approved text and remove the bracketed markers.
2. Set `legal_review_status` to `"approved"` in **Admin → Settings**.
3. Record the reviewer, the date and the version in this file.

import type { HttpContext } from '@adonisjs/core/http'
import Invoice from '#models/invoice/invoice'
import Company from '#models/team/company'
import InvoiceSetting from '#models/team/invoice_setting'
import { buildFacturXFromInvoice, generateFacturXXml } from '#services/pdf/facturx_generator'
import { submitInvoice, validateXml, buildPdpConfig } from '#services/einvoicing/pdp_service'
import {
  decryptModelFields,
  decryptModelFieldsArray,
  ENCRYPTED_FIELDS,
} from '#services/crypto/field_encryption_helper'

export default class EInvoicingSubmit {
  async handle(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const dek: Buffer = (ctx as any).dek
    const user = auth.user!
    const teamId = user.currentTeamId

    if (!teamId) {
      return response.badRequest({ message: 'No team selected' })
    }

    const invoiceSettings = await InvoiceSetting.query().where('team_id', teamId).first()
    if (!invoiceSettings?.eInvoicingEnabled) {
      return response.forbidden({ message: "La facturation electronique n'est pas activee" })
    }

    const invoice = await Invoice.query()
      .where('id', params.id)
      .where('team_id', teamId)
      .preload('client')
      .preload('lines', (q) => q.orderBy('position', 'asc'))
      .first()

    if (!invoice) {
      return response.notFound({ message: 'Facture non trouvee' })
    }

    decryptModelFields(invoice, [...ENCRYPTED_FIELDS.invoice], dek)
    decryptModelFieldsArray(invoice.lines, [...ENCRYPTED_FIELDS.invoiceLine], dek)
    if (invoice.client) {
      decryptModelFields(invoice.client, [...ENCRYPTED_FIELDS.client], dek)
    }

    const company = await Company.query().where('team_id', teamId).first()
    if (company) {
      decryptModelFields(company, [...ENCRYPTED_FIELDS.company], dek)
    }

    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      subject: invoice.subject,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      billingType: invoice.billingType,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      notes: invoice.notes,
      language: invoice.language || 'fr',
      operationCategory: invoice.operationCategory,
      deliveryAddress: invoice.deliveryAddress,
      vatOnDebits: invoice.vatOnDebits,
    }

    const linesData = invoice.lines.map((l) => ({
      description: l.description,
      saleType: l.saleType,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      vatRate: l.vatRate,
      total: l.total,
    }))

    const clientData = invoice.clientSnapshot
      ? JSON.parse(invoice.clientSnapshot)
      : invoice.client
        ? {
            displayName: invoice.client.displayName,
            companyName: invoice.client.companyName,
            firstName: invoice.client.firstName,
            lastName: invoice.client.lastName,
            email: invoice.client.email,
            address: invoice.client.address,
            postalCode: invoice.client.postalCode,
            city: invoice.client.city,
            country: invoice.client.country,
            siren: invoice.clientSiren || invoice.client.siren,
            vatNumber: invoice.clientVatNumber || invoice.client.vatNumber,
          }
        : null

    const companyData = invoice.companySnapshot
      ? JSON.parse(invoice.companySnapshot)
      : company
        ? {
            legalName: company.legalName,
            siren: company.siren,
            siret: company.siret,
            vatNumber: company.vatNumber,
            addressLine1: company.addressLine1,
            postalCode: company.postalCode,
            city: company.city,
            country: company.country,
            email: company.email,
            phone: company.phone,
          }
        : null

    const facturxDoc = buildFacturXFromInvoice(invoiceData, linesData, clientData, companyData)
    const xml = generateFacturXXml(facturxDoc)

    decryptModelFields(invoiceSettings, [...ENCRYPTED_FIELDS.invoiceSetting], dek)

    const pdpConfig = buildPdpConfig(invoiceSettings)

    const validation = await validateXml(pdpConfig, xml)
    if (!validation.valid) {
      return response.unprocessableEntity({
        message: 'Le document ne passe pas la validation',
        errors: validation.errors,
        warnings: validation.warnings,
      })
    }

    const result = await submitInvoice(pdpConfig, xml, {
      documentNumber: invoice.invoiceNumber,
      documentType: 'invoice',
    })

    return response.ok({
      message: result.success ? 'Document soumis avec succes' : 'Erreur lors de la soumission',
      result,
      warnings: validation.warnings,
    })
  }
}

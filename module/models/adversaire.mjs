import { SYSTEM } from "../config/system.mjs"

const { SchemaField, NumberField, StringField } = foundry.data.fields

console.log('Je passe bien par là')

export default class Adversaire extends foundry.abstract.TypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["PENOMBRE.Adversaire"]

  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    // Personnage
    schema.description = new StringField({})
    schema.adversite = new SchemaField({
      valeur: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
        max: 25,
      }),
      max: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
    })
    schema.resilience = new SchemaField({
      valeur: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
        max: 25,
      }),
      max: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
    })
    schema.dissonance = new SchemaField({
      harmonique: new StringField({
        required: true,
        nullable: false,
        initial: SYSTEM.HARMONIQUES_2.ame.id,
        choices: SYSTEM.HARMONIQUES_2
       }),
      valeur: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
        max: 25,
      }),
      max: new NumberField({
        ...requiredInteger,
        initial: 0,
        min: 0,
      }),
    })
    
    // Actions : sous forme d'un item

    // Intrigues : sous forme d'un item

    return schema
  }

  /** @override */
  prepareBaseData() {
  }

  /** @override */
  async _preUpdate(changed, options, user) {
    // Si la valeur d'adversité max ou la valeur de dissonance max change, on met à jour...
    if (foundry.utils.hasProperty(changed, "system.adversite.max")) {
      // foo("system.adversite.valeur", this.adversite.valeur, 0, changed.system.adversite.max, 1)
      foundry.utils.setProperty(changed, "system.resilience.max", changed.system.adversite.max * 3)
      // foo("system.resilience.valeur", this.resilience.valeur, 0, changed.system.adversite.max * 3, 1)
    }
    if (foundry.utils.hasProperty(changed, "system.dissonance.max")) {
      // foo("system.dissonance.valeur", this.dissonance.valeur, 0, changed.system.dissonance.max * 3, 1)
    }
    return super._preUpdate(changed, options, user)
  }
}
/*
function foo (name, value, min, max, step) {
  console.log("foo", name, value, min, max, step)
  if (name) {
    // Here you process the template and put it in the DOM
    var template = $(`range-picker[name="`+name+`"]`).parent().html();
    console.log("foo template = ", template)
    var templateScript = Handlebars.compile(template);
    let result = '';
    // {{rangePicker name="foo" value=bar min=0 max=10 step=1}}
    result += `<range-picker name="`+name+`"`+` value="`+value+`" min="`+min+`" max="`+max+`" step="`+step+`">`+
    `<input type="range" min="`+min+`" max="`+max+`" step="`+step+`">`+
    `<input type="number" min="`+min+`" max="`+max+`" step="`+step+`></range-picker>`
    console.log("foo result = ", result)
    var html = templateScript(result);
    // Once you have inserted your code in the DOM you can now use jQuery to modify it
    $(`range-picker[name="`+name+`"]`).parent().html($(`range-picker[name="`+name+`"]`).parent().html(html))
  }
} */
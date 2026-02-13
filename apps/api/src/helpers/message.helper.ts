export const fillMessageTemplate = (template: string, context: Record<string, string>) => {
  return Object.entries(context)
    .reduce((template, [key, value]) => {
      return template.replace(`{{${key}}}`, value);
    }, template);
};

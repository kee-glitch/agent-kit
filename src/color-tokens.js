export const lightColors={
  'bg-base':'#FFFFFF','bg-elevated':'#F9F9F9','bg-subtle':'#F2F2F2','bg-subtle-alt':'#F7F7F7','bg-surface':'#FFFFFF','bg-inverse':'#202020',
  'text-primary':'#000000','text-secondary':'#646464','text-tertiary':'#838383','text-placeholder':'#8D8D8D','text-disabled':'#BBBBBB','text-waiting':'#D9D9D9','text-inverse':'#FFFFFF',
  'border-focus':'#212121','border-default':'#E0E0E0','border-subtle':'#E8E8E8','border-inverse':'#FFFFFF',
  progress:'#3E63DD','progress-subtle':'#E7ECFA',success:'#12A594','success-subtle':'#E2F4F2',warning:'#EF5F00','warning-subtle':'#FDEBE0',error:'#DC3E42','error-subtle':'#FAE7E8',
  purple:'#F4F0FE',pink:'#FEE9F5',cyan:'#DEF7F9',mint:'#DDF9F2',orange:'#FFEFD6',brown:'#FFFAB8','interaction-hover':'#FAFAFA','interaction-press':'#F2F2F2','overlay-strong':'#636363','overlay-subtle':'#BABABA'
}

export const darkColors={
  'bg-base':'#111111','bg-elevated':'#191919','bg-subtle':'#1F1F1F','bg-subtle-alt':'#1A1A1A','bg-surface':'#222222','bg-inverse':'#FCFCFC',
  'text-primary':'#FFFFFF','text-secondary':'#B4B4B4','text-tertiary':'#7B7B7B','text-placeholder':'#6E6E6E','text-disabled':'#606060','text-waiting':'#3A3A3A','text-inverse':'#000000',
  'border-focus':'#EEEEEE','border-default':'#343434','border-subtle':'#2B2B2B','border-inverse':'#0F0F0F',
  progress:'#3E63DD','progress-subtle':'#161B29',success:'#12A594','success-subtle':'#112321',warning:'#EF5F00','warning-subtle':'#2C1A0F',error:'#DC3E42','error-subtle':'#291617',
  purple:'#4B21F6',pink:'#FD177F',cyan:'#0088F1',mint:'#03DBA5',orange:'#FF6202',brown:'#7D5E54','interaction-hover':'#1F1F1F','interaction-press':'#282828','overlay-strong':'#B5B5B5','overlay-subtle':'#5F5F5F'
}

export const asCssVariables=colors=>Object.fromEntries(Object.entries(colors).map(([name,value])=>[`--color-${name}`,value]))

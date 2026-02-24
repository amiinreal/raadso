import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/api'
import { useTranslation } from '../i18n/TranslationProvider'
import logo from '../assets/logos.png'
import companyLogo from '../assets/logoCompany.png'

export function Footer() {
  const { locale, t } = useTranslation()
  const [dbMap, setDbMap] = useState({})

  useEffect(() => {
    let isMounted = true
    api.getI18nMap(locale).then((res) => {
      if (!isMounted) return
      setDbMap(res?.translations || {})
    }).catch(() => {
      if (isMounted) setDbMap({})
    })
    return () => { isMounted = false }
  }, [locale])

  const tDb = (key, fallback) => dbMap[key] || t(key, fallback)

  return (
    <>
      <footer className="mt-auto py-12 bg-white dark:bg-card-dark border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <img src={logo} alt="RAADI logo" className="h-8 w-auto" />
            <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary text-center md:text-left">
              <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">{tDb('common.app.name', 'RAADI')}</p>
              <p>© 2023 {tDb('common.app.name', 'RAADI')}. All rights reserved.</p>
            </div>
          </div>

          <div className="flex gap-8 text-sm font-medium text-gray-500">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Company Partner Footer */}
      <footer className="py-8 px-4" style={{ backgroundColor: '#BFDDE1' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <img src={companyLogo} alt="MAALIN TECH logo" className="h-16 w-auto object-contain" />
        </div>
      </footer>
    </>
  )
}

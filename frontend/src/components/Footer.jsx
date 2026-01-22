import logo from '../assets/logos.png'
import companyLogo from '../assets/logoCompany.png'

export function Footer() {
  return (
    <>
      <footer className="mt-auto py-8 bg-white dark:bg-card-dark border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
          <img src={logo} alt="RAADI logo" className="h-8 w-auto" />
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">RAADI</p>
            <p>© 2023 RAADI. All rights reserved.</p>
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

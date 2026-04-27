import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const mustChangePassword = user?.user_metadata?.must_change_password === true

  const pathname = request.nextUrl.pathname
  const isLoginRoute = pathname.startsWith('/login')
  const isChangePasswordRoute = pathname.startsWith('/cambiar-contrasena')

  // Sin sesión: redirigir a /login (excepto si ya está ahí)
  if (!user && !isLoginRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Con sesión y debe cambiar contraseña: forzar /cambiar-contrasena
  if (user && mustChangePassword && !isChangePasswordRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/cambiar-contrasena'
    return NextResponse.redirect(url)
  }

  // Con sesión y ya no necesita cambiar contraseña: sacar de /login y /cambiar-contrasena
  if (user && !mustChangePassword && (isLoginRoute || isChangePasswordRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/inicio'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

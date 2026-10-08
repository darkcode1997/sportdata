'use client';

import { imageUrl, imageSrcSet } from '@/lib/image-url';

import { useEffect, useState } from 'react';
import { Button, Skeleton } from 'antd';
import { ChevronLeft, ChevronRight, Images } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

type Banner = {
  id: string;
  title?: string | null;
  altText: string;
  linkUrl?: string | null;
  imageUrl: string;
};

export function HomeBannerSlider() {
  const { data, isLoading } = useSWR<{ items: Banner[] }>('/banners', fetcher);
  const banners = data?.items || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (activeIndex >= banners.length) setActiveIndex(0);
  }, [activeIndex, banners.length]);

  useEffect(() => {
    if (paused || banners.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [banners.length, paused]);

  const previous = () => setActiveIndex((current) => (current - 1 + banners.length) % banners.length);
  const next = () => setActiveIndex((current) => (current + 1) % banners.length);

  if (isLoading) {
    return (
      <section className="home-banner home-banner-loading" aria-label="Đang tải banner">
        <Skeleton.Image active />
      </section>
    );
  }

  if (banners.length === 0) {
    return (
      <section className="home-banner home-banner-empty" aria-label="Banner trang chủ">
        <Images className="h-11 w-11" />
        <span>SportData</span>
      </section>
    );
  }

  return (
    <section
      className="home-banner"
      aria-roledescription="carousel"
      aria-label={`Banner ${activeIndex + 1} trên ${banners.length}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="home-banner-track"
        style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
      >
        {banners.map((banner, index) => {
          const image = (
            // Banner images are managed by trusted CMS editors and served by the API.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(banner.imageUrl, 'hero')}
              srcSet={imageSrcSet(banner.imageUrl)}
              sizes="(max-width: 768px) 100vw, 1600px"
              decoding="async"
              alt={banner.altText}
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchPriority={index === 0 ? 'high' : 'auto'}
            />
          );

          return (
            <article
              key={banner.id}
              className="home-banner-slide"
              aria-hidden={index !== activeIndex}
            >
              {banner.linkUrl ? (
                <a
                  href={banner.linkUrl}
                  tabIndex={index === activeIndex ? 0 : -1}
                  aria-label={banner.title || banner.altText}
                  {...(/^https?:\/\//.test(banner.linkUrl) ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  {image}
                </a>
              ) : image}
            </article>
          );
        })}
      </div>

      {banners.length > 1 && (
        <>
          <Button
            type="text"
            shape="circle"
            className="home-banner-arrow home-banner-arrow-left"
            icon={<ChevronLeft className="h-6 w-6" />}
            aria-label="Banner trước"
            onClick={previous}
          />
          <Button
            type="text"
            shape="circle"
            className="home-banner-arrow home-banner-arrow-right"
            icon={<ChevronRight className="h-6 w-6" />}
            aria-label="Banner tiếp theo"
            onClick={next}
          />
          <div className="home-banner-dots" role="tablist" aria-label="Chọn banner">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={`Xem banner ${index + 1}`}
                className={index === activeIndex ? 'is-active' : ''}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

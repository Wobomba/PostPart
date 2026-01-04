import React, { useRef, useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Colors, BorderRadius } from '../constants/theme';

interface ImageCarouselProps {
  images: string[];
  height?: number;
  placeholderImage?: any;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ImageCarousel({ 
  images, 
  height = 350,
  placeholderImage 
}: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [autoPlayTimer, setAutoPlayTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-play functionality
  useEffect(() => {
    if (images && images.length > 1) {
      const timer = setInterval(() => {
        setActiveIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % images.length;
          // Scroll to next image
          flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
          return nextIndex;
        });
      }, 4000); // 4 seconds

      setAutoPlayTimer(timer);
      return () => {
        if (timer) clearInterval(timer);
      };
    }
  }, [images]);

  // If no images, show placeholder
  if (!images || images.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        {placeholderImage ? (
          <Image source={placeholderImage} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.placeholder, { height }]} />
        )}
      </View>
    );
  }

  // If only one image, no need for carousel
  if (images.length === 1) {
    return (
      <View style={[styles.container, { height }]}>
        <Image source={{ uri: images[0] }} style={styles.image} resizeMode="cover" />
      </View>
    );
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < images.length) {
      setActiveIndex(index);
    }
  };

  const renderItem = ({ item }: { item: string }) => (
    <View style={styles.slide}>
      <Image 
        source={{ uri: item }} 
        style={styles.image} 
        resizeMode="cover"
        defaultSource={placeholderImage}
      />
    </View>
  );

  return (
    <View style={[styles.container, { height }]}>
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderItem}
        keyExtractor={(item, index) => `image-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          // Handle scroll to index failure gracefully
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          });
        }}
      />
      
      {/* Pagination Dots */}
      {images.length > 1 && (
        <View style={styles.pagination}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    backgroundColor: Colors.backgroundDark,
    // Use elevation for Android, boxShadow would be for web
    elevation: 8,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    overflow: 'hidden',
    // Shadow for iOS (using shadowColor, shadowOffset, etc. is fine for React Native)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    backgroundColor: Colors.backgroundDark,
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    width: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});
